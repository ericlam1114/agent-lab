/**
 * Trial Manager
 * Manages multiple trials per task and calculates pass@k metrics
 */

import { v4 as uuidv4 } from 'uuid';
import type { GraderResult } from '../types';
import type { TaskConfig } from '../config/schema';
import type { Provider } from '../providers';
import { getDb } from '../db';
import { trials as trialsTable, results as resultsTable } from '../db/schema';
import { TaskRunner, type TaskResult } from './task-runner';
import { Transcript } from './transcript';

// ============================================================================
// Types
// ============================================================================

export interface TrialManagerConfig {
  trialsPerTask: number;
  maxConcurrency?: number;
  passThreshold?: number;
  onTrialComplete?: TrialCallback;
}

export interface TrialResult {
  id: string;
  taskId: string;
  attempt: number;
  success: boolean;
  score: number;
  passed: boolean;
  response?: {
    output: string;
    toolCalls?: unknown[];
    latencyMs: number;
    tokens?: { prompt: number; completion: number; total: number };
  };
  graderResults: GraderResult[];
  transcript: Transcript;
  durationMs: number;
  error?: string;
}

export interface TaskTrialResults {
  taskId: string;
  trials: TrialResult[];
  passAtK: Record<number, number>;
  passToTheK: Record<number, number>;
  avgScore: number;
  passRate: number;
  totalDurationMs: number;
}

export type TrialCallback = (trial: TrialResult) => void;

// ============================================================================
// Trial Manager Class
// ============================================================================

export class TrialManager {
  private provider: Provider;
  private config: TrialManagerConfig;
  private taskRunner: TaskRunner;

  constructor(provider: Provider, config: TrialManagerConfig, timeout: number = 60000) {
    this.provider = provider;
    this.config = {
      trialsPerTask: config.trialsPerTask,
      maxConcurrency: config.maxConcurrency ?? 1, // Default to sequential for trials
      passThreshold: config.passThreshold ?? 0.5,
      onTrialComplete: config.onTrialComplete,
    };
    this.taskRunner = new TaskRunner(provider, timeout);
  }

  /**
   * Run multiple trials for a task
   */
  async runTrials(
    task: TaskConfig,
    graderFn?: (result: TaskResult, task: TaskConfig) => Promise<GraderResult[]>,
    dbTaskId?: string
  ): Promise<TaskTrialResults> {
    const startTime = Date.now();
    const trials: TrialResult[] = [];
    const n = this.config.trialsPerTask;
    const concurrency = this.config.maxConcurrency ?? 1;

    if (concurrency === 1) {
      // Run sequentially
      for (let i = 0; i < n; i++) {
        const trial = await this.runSingleTrial(task, i + 1, graderFn, dbTaskId);
        trials.push(trial);
        this.config.onTrialComplete?.(trial);
      }
    } else {
      // Run with concurrency
      let currentIndex = 0;
      const runNext = async (): Promise<void> => {
        while (currentIndex < n) {
          const attempt = ++currentIndex;
          const trial = await this.runSingleTrial(task, attempt, graderFn, dbTaskId);
          trials[attempt - 1] = trial;
          this.config.onTrialComplete?.(trial);
        }
      };

      const workers = Array(Math.min(concurrency, n))
        .fill(null)
        .map(() => runNext());

      await Promise.all(workers);
    }

    // Calculate metrics
    const passAtK = this.calculatePassAtK(trials);
    const passToTheK = this.calculatePassToTheK(trials);
    const avgScore = this.calculateAvgScore(trials);
    const passRate = this.calculatePassRate(trials);

    return {
      taskId: task.id,
      trials,
      passAtK,
      passToTheK,
      avgScore,
      passRate,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Run a single trial
   */
  private async runSingleTrial(
    task: TaskConfig,
    attempt: number,
    graderFn?: (result: TaskResult, task: TaskConfig) => Promise<GraderResult[]>,
    dbTaskId?: string
  ): Promise<TrialResult> {
    const trialId = uuidv4();
    const transcript = new Transcript(trialId);

    // Record input
    if (task.input.prompt) {
      transcript.addUserMessage(task.input.prompt);
    } else if (task.input.messages) {
      for (const msg of task.input.messages) {
        transcript.addMessage(
          msg.role as 'user' | 'assistant' | 'system' | 'tool',
          msg.content
        );
      }
    }

    // Execute task
    const taskResult = await this.taskRunner.run(task);

    // Record response
    if (taskResult.response) {
      transcript.addAssistantMessage(taskResult.response.output);

      if (taskResult.response.toolCalls) {
        for (const toolCall of taskResult.response.toolCalls) {
          transcript.addToolCall(toolCall);
          if (toolCall.result || toolCall.error) {
            transcript.addToolResult(toolCall.id, toolCall.result, toolCall.error);
          }
        }
      }

      if (taskResult.response.tokens) {
        transcript.updateTokens(taskResult.response.tokens);
      }

      if (taskResult.response.latencyMs) {
        transcript.addLatency(taskResult.response.latencyMs);
      }
    }

    transcript.complete();

    // Run graders
    let graderResults: GraderResult[] = [];
    if (graderFn && taskResult.success) {
      graderResults = await graderFn(taskResult, task);
    } else if (!taskResult.success) {
      // Mark all graders as failed if task failed
      graderResults = task.graders.map((g, i) => ({
        graderId: `${g.type}-${i}`,
        graderType: g.type,
        passed: false,
        score: 0,
        details: 'Task execution failed',
        error: taskResult.error?.message,
      }));
    }

    // Calculate score and pass status
    const score = this.calculateTrialScore(graderResults);
    const passed = score >= (this.config.passThreshold ?? 0.5);

    const trial: TrialResult = {
      id: trialId,
      taskId: task.id,
      attempt,
      success: taskResult.success,
      score,
      passed,
      response: taskResult.response,
      graderResults,
      transcript,
      durationMs: taskResult.metrics.durationMs,
      error: taskResult.error?.message,
    };

    // Save to database if task ID provided
    if (dbTaskId) {
      await this.saveTrialToDb(trial, dbTaskId);
    }

    return trial;
  }

  /**
   * Calculate pass@k - probability of at least 1 success in k attempts
   *
   * Formula: pass@k = 1 - (C(n-c, k) / C(n, k))
   * where n = total trials, c = passed trials, k = attempts
   *
   * Simplified: For a population of n trials with c passes,
   * the probability that at least 1 of k random trials passes.
   */
  calculatePassAtK(trials: TrialResult[]): Record<number, number> {
    const n = trials.length;
    const c = trials.filter((t) => t.passed).length;
    const result: Record<number, number> = {};

    // Calculate for k = 1, 2, 3, ..., n
    for (let k = 1; k <= n; k++) {
      if (c === 0) {
        result[k] = 0;
      } else if (c >= k) {
        // At least k passes exist
        result[k] = 1 - this.combinatorial(n - c, k) / this.combinatorial(n, k);
      } else {
        // Fewer passes than k
        result[k] = 1 - this.combinatorial(n - c, k) / this.combinatorial(n, k);
      }

      // Clamp to [0, 1] to handle floating point issues
      result[k] = Math.max(0, Math.min(1, result[k]));
    }

    return result;
  }

  /**
   * Calculate pass^k - probability that all k attempts succeed
   *
   * Formula: pass^k = (c/n)^k for independent trials
   * where c = passed trials, n = total trials
   */
  calculatePassToTheK(trials: TrialResult[]): Record<number, number> {
    const n = trials.length;
    const c = trials.filter((t) => t.passed).length;
    const passRate = n > 0 ? c / n : 0;
    const result: Record<number, number> = {};

    // Calculate for k = 1, 2, 3, ..., n
    for (let k = 1; k <= n; k++) {
      result[k] = Math.pow(passRate, k);
    }

    return result;
  }

  /**
   * Calculate average score across trials
   */
  calculateAvgScore(trials: TrialResult[]): number {
    if (trials.length === 0) return 0;
    const sum = trials.reduce((acc, t) => acc + t.score, 0);
    return sum / trials.length;
  }

  /**
   * Calculate pass rate (percentage of passed trials)
   */
  calculatePassRate(trials: TrialResult[]): number {
    if (trials.length === 0) return 0;
    const passed = trials.filter((t) => t.passed).length;
    return passed / trials.length;
  }

  /**
   * Calculate trial score from grader results
   */
  private calculateTrialScore(graderResults: GraderResult[]): number {
    if (graderResults.length === 0) return 0;

    // Calculate weighted average if weights are specified
    let totalWeight = 0;
    let weightedSum = 0;

    for (const result of graderResults) {
      const weight = 1; // TODO: Support grader weights
      weightedSum += result.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Combinatorial function C(n, k) = n! / (k! * (n-k)!)
   */
  private combinatorial(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    // Use the smaller k for efficiency
    if (k > n - k) {
      k = n - k;
    }

    let result = 1;
    for (let i = 0; i < k; i++) {
      result = (result * (n - i)) / (i + 1);
    }

    return result;
  }

  /**
   * Save trial result to database
   */
  private async saveTrialToDb(trial: TrialResult, taskId: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    // Save trial
    await db.insert(trialsTable).values({
      id: trial.id,
      taskId,
      attempt: trial.attempt,
      status: trial.success ? 'completed' : 'failed',
      score: trial.score,
      passed: trial.passed,
      transcript: JSON.stringify(trial.transcript.toJSON()),
      outcome: JSON.stringify({ success: trial.passed }),
      latencyMs: trial.durationMs,
      promptTokens: trial.response?.tokens?.prompt,
      completionTokens: trial.response?.tokens?.completion,
      totalTokens: trial.response?.tokens?.total,
      startedAt: now,
      completedAt: now,
      error: trial.error,
    });

    // Save grader results
    for (const graderResult of trial.graderResults) {
      await db.insert(resultsTable).values({
        id: uuidv4(),
        trialId: trial.id,
        graderId: graderResult.graderId,
        graderType: graderResult.graderType,
        score: graderResult.score,
        passed: graderResult.passed,
        details: graderResult.details,
        error: graderResult.error,
        createdAt: now,
      });
    }
  }

  /**
   * Get configuration
   */
  getConfig(): TrialManagerConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTrialManager(
  provider: Provider,
  config: TrialManagerConfig,
  timeout?: number
): TrialManager {
  return new TrialManager(provider, config, timeout);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate pass@k for a set of trial results
 */
export function calculatePassAtK(
  passed: number,
  total: number,
  k: number
): number {
  if (total === 0 || k > total) return 0;
  if (passed === 0) return 0;

  // C(total - passed, k) / C(total, k)
  const combinatorial = (n: number, r: number): number => {
    if (r < 0 || r > n) return 0;
    if (r === 0 || r === n) return 1;
    if (r > n - r) r = n - r;
    let result = 1;
    for (let i = 0; i < r; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    return result;
  };

  const prob = 1 - combinatorial(total - passed, k) / combinatorial(total, k);
  return Math.max(0, Math.min(1, prob));
}

/**
 * Calculate pass^k for a given pass rate
 */
export function calculatePassToTheK(passRate: number, k: number): number {
  return Math.pow(passRate, k);
}
