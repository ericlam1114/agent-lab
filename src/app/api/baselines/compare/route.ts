/**
 * API Route: /api/baselines/compare
 * Compare an eval against a baseline showing metric deltas (Task 66)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../../agent-evals/src/db/migrate';
import { baselines, evals, tasks, trials } from '../../../../../agent-evals/src/db/schema';
import { eq } from 'drizzle-orm';

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

/**
 * Calculate metrics for an eval
 */
async function calculateEvalMetrics(db: ReturnType<typeof getDb>, evalId: string) {
  // Get eval data
  const evalData = await db.select()
    .from(evals)
    .where(eq(evals.id, evalId))
    .limit(1);

  if (evalData.length === 0) {
    throw new Error('Eval not found');
  }

  // Get all tasks for this eval
  const evalTasks = await db.select()
    .from(tasks)
    .where(eq(tasks.evalId, evalId));

  // Get all trials for this eval
  const allTrials = [];
  for (const task of evalTasks) {
    const taskTrials = await db.select()
      .from(trials)
      .where(eq(trials.taskId, task.id));
    allTrials.push(...taskTrials);
  }

  // Calculate metrics
  const passedTrials = allTrials.filter(t => t.passed).length;
  const totalTrials = allTrials.length;
  const passRate = totalTrials > 0 ? passedTrials / totalTrials : 0;

  // Calculate pass@k metrics
  const passAtK: Record<number, number> = {};
  const kValues = [1, 3, 5, 10];

  for (const k of kValues) {
    if (totalTrials >= k) {
      passAtK[k] = 1 - Math.pow(1 - passRate, k);
    } else {
      passAtK[k] = passRate;
    }
  }

  // Calculate latency metrics
  const latencies = allTrials
    .filter(t => t.latencyMs !== null)
    .map(t => t.latencyMs as number);

  let avgLatency = 0;
  let p50Latency = 0;
  let p95Latency = 0;
  let p99Latency = 0;

  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    p50Latency = latencies[Math.floor(latencies.length * 0.5)];
    p95Latency = latencies[Math.floor(latencies.length * 0.95)];
    p99Latency = latencies[Math.floor(latencies.length * 0.99)];
  }

  // Calculate token usage
  const totalTokens = allTrials.reduce((sum, t) => sum + (t.totalTokens || 0), 0);
  const promptTokens = allTrials.reduce((sum, t) => sum + (t.promptTokens || 0), 0);
  const completionTokens = allTrials.reduce((sum, t) => sum + (t.completionTokens || 0), 0);

  return {
    passRate,
    passAtK,
    totalTasks: evalTasks.length,
    totalTrials,
    passedTrials,
    latency: {
      avg: avgLatency,
      p50: p50Latency,
      p95: p95Latency,
      p99: p99Latency,
    },
    tokens: {
      total: totalTokens,
      prompt: promptTokens,
      completion: completionTokens,
    },
    evalName: evalData[0].name,
    evalStatus: evalData[0].status,
    evalCreatedAt: evalData[0].createdAt,
  };
}

/**
 * Calculate delta and percentage change
 */
function calculateDelta(current: number, baseline: number): { delta: number; percentChange: number; direction: 'up' | 'down' | 'same' } {
  const delta = current - baseline;
  const percentChange = baseline !== 0 ? (delta / baseline) * 100 : 0;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
  return { delta, percentChange, direction };
}

// POST - Compare an eval against a baseline
export async function POST(request: NextRequest) {
  try {
    const db = initDb();
    const body = await request.json();
    const { evalId, baselineId } = body;

    if (!evalId) {
      return NextResponse.json(
        { error: 'Eval ID is required' },
        { status: 400 }
      );
    }

    if (!baselineId) {
      return NextResponse.json(
        { error: 'Baseline ID is required' },
        { status: 400 }
      );
    }

    // Get baseline
    const baseline = await db.select()
      .from(baselines)
      .where(eq(baselines.id, baselineId))
      .limit(1);

    if (baseline.length === 0) {
      return NextResponse.json(
        { error: 'Baseline not found' },
        { status: 404 }
      );
    }

    const baselineMetrics = JSON.parse(baseline[0].metrics);

    // Calculate current eval metrics
    const currentMetrics = await calculateEvalMetrics(db, evalId);

    // Calculate deltas
    const comparison = {
      evalId,
      baselineId,
      baselineName: baseline[0].name,
      currentEvalName: currentMetrics.evalName,

      passRate: {
        current: currentMetrics.passRate,
        baseline: baselineMetrics.passRate,
        ...calculateDelta(currentMetrics.passRate, baselineMetrics.passRate),
        isRegression: currentMetrics.passRate < baselineMetrics.passRate - 0.05, // 5% threshold
      },

      passAtK: Object.fromEntries(
        [1, 3, 5, 10].map(k => [
          k,
          {
            current: currentMetrics.passAtK[k],
            baseline: baselineMetrics.passAtK[k],
            ...calculateDelta(currentMetrics.passAtK[k], baselineMetrics.passAtK[k]),
            isRegression: k === 1
              ? currentMetrics.passAtK[k] < baselineMetrics.passAtK[k] - 0.10 // 10% threshold for pass@1
              : currentMetrics.passAtK[k] < baselineMetrics.passAtK[k] - 0.05,
          }
        ])
      ),

      latency: {
        avg: {
          current: currentMetrics.latency.avg,
          baseline: baselineMetrics.latency.avg,
          ...calculateDelta(currentMetrics.latency.avg, baselineMetrics.latency.avg),
          isRegression: currentMetrics.latency.avg > baselineMetrics.latency.avg * 1.20, // 20% threshold
        },
        p50: {
          current: currentMetrics.latency.p50,
          baseline: baselineMetrics.latency.p50,
          ...calculateDelta(currentMetrics.latency.p50, baselineMetrics.latency.p50),
        },
        p95: {
          current: currentMetrics.latency.p95,
          baseline: baselineMetrics.latency.p95,
          ...calculateDelta(currentMetrics.latency.p95, baselineMetrics.latency.p95),
        },
        p99: {
          current: currentMetrics.latency.p99,
          baseline: baselineMetrics.latency.p99,
          ...calculateDelta(currentMetrics.latency.p99, baselineMetrics.latency.p99),
        },
      },

      tokens: {
        total: {
          current: currentMetrics.tokens.total,
          baseline: baselineMetrics.tokens.total,
          ...calculateDelta(currentMetrics.tokens.total, baselineMetrics.tokens.total),
        },
        prompt: {
          current: currentMetrics.tokens.prompt,
          baseline: baselineMetrics.tokens.prompt,
          ...calculateDelta(currentMetrics.tokens.prompt, baselineMetrics.tokens.prompt),
        },
        completion: {
          current: currentMetrics.tokens.completion,
          baseline: baselineMetrics.tokens.completion,
          ...calculateDelta(currentMetrics.tokens.completion, baselineMetrics.tokens.completion),
        },
      },

      summary: {
        hasRegressions: false,
        regressionCount: 0,
        improvementCount: 0,
        regressions: [] as string[],
        improvements: [] as string[],
      },
    };

    // Analyze regressions and improvements
    if (comparison.passRate.isRegression) {
      comparison.summary.regressions.push('Pass rate dropped by more than 5%');
    } else if (comparison.passRate.direction === 'up' && comparison.passRate.percentChange > 5) {
      comparison.summary.improvements.push('Pass rate improved by more than 5%');
    }

    if (comparison.passAtK[1]?.isRegression) {
      comparison.summary.regressions.push('Pass@1 dropped by more than 10%');
    }

    if (comparison.latency.avg.isRegression) {
      comparison.summary.regressions.push('Average latency increased by more than 20%');
    } else if (comparison.latency.avg.direction === 'down' && Math.abs(comparison.latency.avg.percentChange) > 10) {
      comparison.summary.improvements.push('Average latency decreased by more than 10%');
    }

    comparison.summary.hasRegressions = comparison.summary.regressions.length > 0;
    comparison.summary.regressionCount = comparison.summary.regressions.length;
    comparison.summary.improvementCount = comparison.summary.improvements.length;

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error comparing eval to baseline:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compare eval to baseline' },
      { status: 500 }
    );
  }
}
