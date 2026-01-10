/**
 * API Route: /api/optimize
 * Run DSPy-style prompt optimization (Task 71)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../agent-evals/src/db/migrate';
import { prompts, datasets, datasetRows } from '../../../../agent-evals/src/db/schema';
import { eq } from 'drizzle-orm';
import {
  PromptOptimizer,
  OptimizationConfig,
  OptimizationStrategy,
  OptimizationMetric,
} from '../../../../agent-evals/src/optimizer/prompt-optimizer';

// Initialize database on first request
let dbInitialized = false;

function initDb() {
  if (!dbInitialized) {
    try {
      runMigrations();
      dbInitialized = true;
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }
  return getDb();
}

interface OptimizeRequest {
  promptId: string;
  datasetId: string;
  strategy: OptimizationStrategy;
  metric: OptimizationMetric;
  iterations: number;
  candidatesPerRound: number;
  kValue?: number;
  maxFewShotExamples?: number;
  temperature?: number;
  earlyStopThreshold?: number | null;
}

/**
 * Simple mock evaluation function for demonstration
 * In production, this would call the actual agent and graders
 */
async function createEvaluator(prompt: string, graderType: string = 'contains') {
  return async (
    promptTemplate: string,
    testData: Record<string, string>[]
  ): Promise<{
    passRate: number;
    passAtK: Record<number, number>;
    avgScore: number;
    avgLatency: number;
    trials: {
      taskId: string;
      passed: boolean;
      score: number;
      input: string;
      output: string;
    }[];
  }> => {
    const trials = [];
    let passCount = 0;
    let totalScore = 0;
    const latencies: number[] = [];

    for (const row of testData) {
      const startTime = Date.now();

      // Substitute variables into prompt
      let filledPrompt = promptTemplate;
      for (const [key, value] of Object.entries(row)) {
        filledPrompt = filledPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }

      // Mock evaluation (in production, call actual agent)
      // For demo: longer prompts with specific keywords score better
      const hasChainOfThought = filledPrompt.toLowerCase().includes('step by step');
      const hasClear = filledPrompt.toLowerCase().includes('clear');
      const hasExamples = filledPrompt.toLowerCase().includes('example');
      const hasContext = filledPrompt.toLowerCase().includes('context');

      // Base score with some randomness
      let score = 0.5 + Math.random() * 0.2;
      if (hasChainOfThought) score += 0.1;
      if (hasClear) score += 0.05;
      if (hasExamples) score += 0.1;
      if (hasContext) score += 0.05;
      score = Math.min(1, score);

      const passed = score >= 0.6;
      if (passed) passCount++;
      totalScore += score;

      const latency = 100 + Math.random() * 200;
      latencies.push(latency);

      trials.push({
        taskId: `task_${Math.random().toString(36).substr(2, 9)}`,
        passed,
        score,
        input: JSON.stringify(row),
        output: `[Mock response for prompt length ${filledPrompt.length}]`,
      });
    }

    const passRate = testData.length > 0 ? passCount / testData.length : 0;
    const avgScore = testData.length > 0 ? totalScore / testData.length : 0;
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    // Calculate pass@k
    const passAtK: Record<number, number> = {};
    for (const k of [1, 3, 5]) {
      passAtK[k] = 1 - Math.pow(1 - passRate, k);
    }

    return {
      passRate,
      passAtK,
      avgScore,
      avgLatency,
      trials,
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const db = initDb();
    const body: OptimizeRequest = await request.json();

    // Validate required fields
    if (!body.promptId || !body.datasetId) {
      return NextResponse.json(
        { error: 'promptId and datasetId are required' },
        { status: 400 }
      );
    }

    // Fetch prompt
    const promptResults = await db.select()
      .from(prompts)
      .where(eq(prompts.id, body.promptId))
      .limit(1);

    if (promptResults.length === 0) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    const prompt = promptResults[0];

    // Fetch dataset
    const datasetResults = await db.select()
      .from(datasets)
      .where(eq(datasets.id, body.datasetId))
      .limit(1);

    if (datasetResults.length === 0) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // Fetch dataset rows
    const rows = await db.select()
      .from(datasetRows)
      .where(eq(datasetRows.datasetId, body.datasetId));

    const testData = rows.map(row => JSON.parse(row.values));

    if (testData.length === 0) {
      return NextResponse.json(
        { error: 'Dataset has no rows' },
        { status: 400 }
      );
    }

    // Create optimizer config
    const config: OptimizationConfig = {
      strategy: body.strategy || 'mipro',
      metric: body.metric || 'pass_rate',
      iterations: body.iterations || 5,
      candidatesPerRound: body.candidatesPerRound || 3,
      kValue: body.kValue || 1,
      maxFewShotExamples: body.maxFewShotExamples || 5,
      temperature: body.temperature || 0.7,
      earlyStopThreshold: body.earlyStopThreshold || undefined,
    };

    // Create optimizer
    const optimizer = new PromptOptimizer(config);

    // Create evaluator
    const evaluate = await createEvaluator(prompt.template);

    // Run optimization
    const result = await optimizer.optimize(prompt.template, testData, evaluate);

    // Format response
    return NextResponse.json({
      bestCandidate: {
        id: result.bestCandidate.id,
        prompt: result.bestCandidate.prompt,
        generation: result.bestCandidate.generation,
      },
      bestScore: result.bestScore,
      history: result.history.map(h => ({
        id: h.candidate.id,
        prompt: h.candidate.prompt,
        generation: h.candidate.generation,
        score: h.score,
        passRate: h.passRate,
        passAtK: h.passAtK,
      })),
      improvementPercent: result.improvementPercent,
      totalEvaluations: result.totalEvaluations,
      stoppedEarly: result.stoppedEarly,
    });
  } catch (error) {
    console.error('Optimization error:', error);
    return NextResponse.json(
      { error: 'Optimization failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
