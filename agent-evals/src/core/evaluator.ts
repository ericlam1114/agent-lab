/**
 * Evaluator
 * Main orchestrator for running evaluations with configurable concurrency
 */

import { v4 as uuidv4 } from 'uuid';
import type { EvalSettings, AgentResponse, GraderResult } from '../types';
import type { EvalConfig, TaskConfig } from '../config/schema';
import { createProvider, type Provider } from '../providers';
import { getDb } from '../db';
import { evals, tasks, trials, results } from '../db/schema';
import { TaskRunner, type TaskResult } from './task-runner';
import { Transcript } from './transcript';

// ============================================================================
// Types
// ============================================================================

export interface EvaluatorConfig {
  config: EvalConfig;
  onProgress?: ProgressCallback;
  saveToDb?: boolean;
}

export interface EvaluatorResult {
  id: string;
  name: string;
  status: 'completed' | 'failed';
  taskResults: TaskEvalResult[];
  totalTasks: number;
  completedTasks: number;
  passedTasks: number;
  passRate: number;
  totalDurationMs: number;
  startedAt: Date;
  completedAt: Date;
}

export interface TaskEvalResult {
  taskId: string;
  taskDescription: string;
  success: boolean;
  response?: AgentResponse;
  graderResults: GraderResult[];
  score: number;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface EvalProgress {
  evalId: string;
  currentTask: number;
  totalTasks: number;
  completedTasks: number;
  passedTasks: number;
  currentTaskId?: string;
  status: 'running' | 'completed' | 'failed';
  elapsedMs: number;
}

export type ProgressCallback = (progress: EvalProgress) => void;

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: Required<EvalSettings> = {
  trialsPerTask: 1,
  maxConcurrency: 3,
  passThreshold: 0.5,
  timeout: 60000,
  retries: 3,
};

// ============================================================================
// Evaluator Class
// ============================================================================

export class Evaluator {
  private config: EvalConfig;
  private settings: Required<EvalSettings>;
  private provider: Provider;
  private taskRunner: TaskRunner;
  private onProgress?: ProgressCallback;
  private saveToDb: boolean;
  private evalId: string;
  private startTime: Date;

  constructor(options: EvaluatorConfig) {
    this.config = options.config;
    this.settings = { ...DEFAULT_SETTINGS, ...options.config.settings };
    this.onProgress = options.onProgress;
    this.saveToDb = options.saveToDb ?? true;
    this.evalId = uuidv4();
    this.startTime = new Date();

    // Initialize provider
    this.provider = createProvider(this.config.agent);
    this.taskRunner = new TaskRunner(this.provider, this.settings.timeout);
  }

  /**
   * Run the evaluation
   */
  async run(): Promise<EvaluatorResult> {
    const startedAt = new Date();
    const taskConfigs = this.config.tasks;

    // Save eval to database if enabled
    if (this.saveToDb) {
      await this.saveEval();
    }

    // Run tasks with concurrency control
    const taskResults = await this.runTasksWithConcurrency(taskConfigs);

    const completedAt = new Date();
    const passedTasks = taskResults.filter((r) => r.passed).length;

    const result: EvaluatorResult = {
      id: this.evalId,
      name: this.config.name,
      status: 'completed',
      taskResults,
      totalTasks: taskConfigs.length,
      completedTasks: taskResults.length,
      passedTasks,
      passRate: taskResults.length > 0 ? passedTasks / taskResults.length : 0,
      totalDurationMs: completedAt.getTime() - startedAt.getTime(),
      startedAt,
      completedAt,
    };

    // Update eval status in database
    if (this.saveToDb) {
      await this.updateEvalStatus('completed');
    }

    // Final progress update
    this.emitProgress({
      currentTask: taskConfigs.length,
      completedTasks: taskResults.length,
      passedTasks,
      status: 'completed',
    });

    return result;
  }

  /**
   * Run tasks with configurable concurrency using a promise pool
   */
  private async runTasksWithConcurrency(taskConfigs: TaskConfig[]): Promise<TaskEvalResult[]> {
    const results: TaskEvalResult[] = [];
    const concurrency = this.settings.maxConcurrency;
    let currentIndex = 0;
    let completedCount = 0;
    let passedCount = 0;

    // Create a pool of promises
    const runNext = async (): Promise<void> => {
      while (currentIndex < taskConfigs.length) {
        const taskIndex = currentIndex++;
        const taskConfig = taskConfigs[taskIndex];

        // Emit progress for task start
        this.emitProgress({
          currentTask: taskIndex + 1,
          completedTasks: completedCount,
          passedTasks: passedCount,
          currentTaskId: taskConfig.id,
          status: 'running',
        });

        // Run the task
        const result = await this.runSingleTask(taskConfig);
        results[taskIndex] = result;

        completedCount++;
        if (result.passed) passedCount++;

        // Save task result to database
        if (this.saveToDb) {
          await this.saveTaskResult(taskConfig, result, taskIndex);
        }
      }
    };

    // Start concurrent workers
    const workers = Array(Math.min(concurrency, taskConfigs.length))
      .fill(null)
      .map(() => runNext());

    await Promise.all(workers);

    return results;
  }

  /**
   * Run a single task and evaluate with graders
   */
  private async runSingleTask(taskConfig: TaskConfig): Promise<TaskEvalResult> {
    const transcript = new Transcript();

    // Record input
    if (taskConfig.input.prompt) {
      transcript.addUserMessage(taskConfig.input.prompt);
    } else if (taskConfig.input.messages) {
      for (const msg of taskConfig.input.messages) {
        transcript.addMessage(msg.role as 'user' | 'assistant' | 'system' | 'tool', msg.content);
      }
    }

    // Execute task
    const taskResult = await this.taskRunner.run(taskConfig);

    // Record response
    if (taskResult.response) {
      transcript.addAssistantMessage(taskResult.response.output);

      // Record tool calls
      if (taskResult.response.toolCalls) {
        for (const toolCall of taskResult.response.toolCalls) {
          transcript.addToolCall(toolCall);
          if (toolCall.result || toolCall.error) {
            transcript.addToolResult(toolCall.id, toolCall.result, toolCall.error);
          }
        }
      }

      // Update token counts
      if (taskResult.response.tokens) {
        transcript.updateTokens(taskResult.response.tokens);
      }
    }

    transcript.complete();

    // Run graders (placeholder - will be implemented in Tasks 9-16)
    const graderResults = await this.runGraders(taskConfig, taskResult);

    // Calculate score
    const score = this.calculateScore(graderResults);
    const passed = score >= this.settings.passThreshold;

    return {
      taskId: taskConfig.id,
      taskDescription: taskConfig.description,
      success: taskResult.success,
      response: taskResult.response,
      graderResults,
      score,
      passed,
      durationMs: taskResult.metrics.durationMs,
      error: taskResult.error?.message,
    };
  }

  /**
   * Run all graders for a task result
   * Note: Actual grader implementations will come in Tasks 9-16
   */
  private async runGraders(
    taskConfig: TaskConfig,
    taskResult: TaskResult
  ): Promise<GraderResult[]> {
    const graderResults: GraderResult[] = [];

    if (!taskResult.success || !taskResult.response) {
      // Task failed, all graders fail
      for (const graderConfig of taskConfig.graders) {
        graderResults.push({
          graderId: `${graderConfig.type}-${graderResults.length}`,
          graderType: graderConfig.type,
          passed: false,
          score: 0,
          details: 'Task execution failed',
          error: taskResult.error?.message,
        });
      }
      return graderResults;
    }

    // Placeholder grading - actual implementations in Tasks 9-16
    for (const graderConfig of taskConfig.graders) {
      const result = await this.runSingleGrader(graderConfig, taskResult.response);
      graderResults.push(result);
    }

    return graderResults;
  }

  /**
   * Run a single grader (placeholder implementation)
   */
  private async runSingleGrader(
    graderConfig: { type: string; value?: string; threshold?: number; weight?: number },
    response: AgentResponse
  ): Promise<GraderResult> {
    // Placeholder implementation - will be replaced by actual graders
    // For now, just check if there's output
    const hasOutput = !!response.output && response.output.trim().length > 0;

    return {
      graderId: `${graderConfig.type}-placeholder`,
      graderType: graderConfig.type as GraderResult['graderType'],
      passed: hasOutput,
      score: hasOutput ? 1 : 0,
      details: hasOutput
        ? 'Placeholder: output received'
        : 'Placeholder: no output',
    };
  }

  /**
   * Calculate overall score from grader results
   */
  private calculateScore(graderResults: GraderResult[]): number {
    if (graderResults.length === 0) return 0;

    const totalScore = graderResults.reduce((sum, r) => sum + r.score, 0);
    return totalScore / graderResults.length;
  }

  /**
   * Emit progress update
   */
  private emitProgress(update: Partial<EvalProgress>): void {
    if (!this.onProgress) return;

    const progress: EvalProgress = {
      evalId: this.evalId,
      currentTask: update.currentTask ?? 0,
      totalTasks: this.config.tasks.length,
      completedTasks: update.completedTasks ?? 0,
      passedTasks: update.passedTasks ?? 0,
      currentTaskId: update.currentTaskId,
      status: update.status ?? 'running',
      elapsedMs: Date.now() - this.startTime.getTime(),
    };

    this.onProgress(progress);
  }

  /**
   * Save evaluation to database
   */
  private async saveEval(): Promise<void> {
    const db = getDb();
    await db.insert(evals).values({
      id: this.evalId,
      name: this.config.name,
      description: this.config.description,
      config: JSON.stringify(this.config),
      status: 'running',
      totalTasks: this.config.tasks.length,
      completedTasks: 0,
      totalTrials: 0,
      passedTrials: 0,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    });
  }

  /**
   * Update evaluation status in database
   */
  private async updateEvalStatus(status: 'completed' | 'failed'): Promise<void> {
    const db = getDb();
    const { eq } = await import('drizzle-orm');
    await db.update(evals).set({ status }).where(eq(evals.id, this.evalId));
  }

  /**
   * Save task result to database
   */
  private async saveTaskResult(
    taskConfig: TaskConfig,
    result: TaskEvalResult,
    taskIndex: number = 0
  ): Promise<void> {
    const db = getDb();
    const taskId = uuidv4();
    const trialId = uuidv4();
    const now = new Date().toISOString();

    // Save task
    await db.insert(tasks).values({
      id: taskId,
      evalId: this.evalId,
      taskIndex,
      description: taskConfig.description,
      type: taskConfig.type ?? 'coding', // Default to coding if not specified
      input: JSON.stringify(taskConfig.input),
      graders: JSON.stringify(taskConfig.graders),
      trackedMetrics: JSON.stringify(taskConfig.trackedMetrics ?? []),
      status: result.success ? 'completed' : 'failed',
      avgScore: result.score,
      passRate: result.passed ? 1 : 0,
      createdAt: now,
      completedAt: now,
    });

    // Save trial
    await db.insert(trials).values({
      id: trialId,
      taskId,
      attempt: 1,
      status: result.success ? 'completed' : 'failed',
      score: result.score,
      passed: result.passed,
      transcript: JSON.stringify(result.response ?? {}),
      outcome: JSON.stringify({ success: result.passed }),
      latencyMs: result.durationMs,
      startedAt: now,
      completedAt: now,
    });

    // Save grader results
    for (const graderResult of result.graderResults) {
      await db.insert(results).values({
        id: uuidv4(),
        trialId,
        graderId: graderResult.graderId,
        graderType: graderResult.graderType,
        score: graderResult.score,
        passed: graderResult.passed,
        details: graderResult.details ?? '',
        createdAt: now,
      });
    }
  }

  /**
   * Get the evaluation ID
   */
  getEvalId(): string {
    return this.evalId;
  }

  /**
   * Get the configuration
   */
  getConfig(): EvalConfig {
    return this.config;
  }

  /**
   * Get the settings
   */
  getSettings(): Required<EvalSettings> {
    return this.settings;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEvaluator(options: EvaluatorConfig): Evaluator {
  return new Evaluator(options);
}

/**
 * Run an evaluation from a config
 */
export async function runEvaluation(
  config: EvalConfig,
  options?: {
    onProgress?: ProgressCallback;
    saveToDb?: boolean;
  }
): Promise<EvaluatorResult> {
  const evaluator = createEvaluator({
    config,
    onProgress: options?.onProgress,
    saveToDb: options?.saveToDb,
  });

  return evaluator.run();
}
