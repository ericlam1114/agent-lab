/**
 * API Route: /api/trends
 * Aggregate eval metrics over time for trend analysis (Task 68)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../agent-evals/src/db/migrate';
import { evals, tasks, trials } from '../../../../agent-evals/src/db/schema';
import { eq, desc, gte, lte, and, sql } from 'drizzle-orm';

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

interface TrendDataPoint {
  date: string;
  evalId: string;
  evalName: string;
  passRate: number;
  passAt1: number;
  passAt3: number;
  passAt5: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  totalTokens: number;
  estimatedCost: number;
  taskCount: number;
  trialCount: number;
}

// Cost per 1K tokens (rough estimates)
const TOKEN_COSTS: Record<string, { prompt: number; completion: number }> = {
  'gpt-4': { prompt: 0.03, completion: 0.06 },
  'gpt-4o': { prompt: 0.005, completion: 0.015 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'claude-3-opus': { prompt: 0.015, completion: 0.075 },
  'claude-3-sonnet': { prompt: 0.003, completion: 0.015 },
  'claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
  'default': { prompt: 0.001, completion: 0.002 },
};

function estimateCost(promptTokens: number, completionTokens: number): number {
  const costs = TOKEN_COSTS['default'];
  return (promptTokens / 1000 * costs.prompt) + (completionTokens / 1000 * costs.completion);
}

function calculatePassAtK(passRate: number, k: number): number {
  // pass@k = 1 - (1 - passRate)^k
  return 1 - Math.pow(1 - passRate, k);
}

export async function GET(request: NextRequest) {
  try {
    const db = initDb();
    const searchParams = request.nextUrl.searchParams;

    // Filters
    const suiteId = searchParams.get('suiteId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query conditions
    const conditions = [];
    conditions.push(eq(evals.status, 'completed'));

    if (startDate) {
      conditions.push(gte(evals.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(evals.createdAt, endDate));
    }

    // Get completed evals
    const evalResults = await db.select()
      .from(evals)
      .where(and(...conditions))
      .orderBy(desc(evals.createdAt))
      .limit(limit);

    // Calculate detailed metrics for each eval
    const trendData: TrendDataPoint[] = [];

    for (const evalItem of evalResults) {
      // Get all tasks for this eval
      const evalTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.evalId, evalItem.id));

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

      // Latency metrics
      const latencies = allTrials
        .filter(t => t.latencyMs !== null)
        .map(t => t.latencyMs as number)
        .sort((a, b) => a - b);

      let avgLatency = 0;
      let p50Latency = 0;
      let p95Latency = 0;

      if (latencies.length > 0) {
        avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        p50Latency = latencies[Math.floor(latencies.length * 0.5)] || 0;
        p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
      }

      // Token usage
      const promptTokens = allTrials.reduce((sum, t) => sum + (t.promptTokens || 0), 0);
      const completionTokens = allTrials.reduce((sum, t) => sum + (t.completionTokens || 0), 0);
      const totalTokens = promptTokens + completionTokens;

      trendData.push({
        date: evalItem.createdAt,
        evalId: evalItem.id,
        evalName: evalItem.name,
        passRate,
        passAt1: calculatePassAtK(passRate, 1),
        passAt3: calculatePassAtK(passRate, 3),
        passAt5: calculatePassAtK(passRate, 5),
        avgLatency,
        p50Latency,
        p95Latency,
        totalTokens,
        estimatedCost: estimateCost(promptTokens, completionTokens),
        taskCount: evalTasks.length,
        trialCount: totalTrials,
      });
    }

    // Sort by date ascending for charts
    trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate aggregated statistics
    const stats = {
      totalEvals: trendData.length,
      avgPassRate: trendData.length > 0
        ? trendData.reduce((sum, d) => sum + d.passRate, 0) / trendData.length
        : 0,
      avgLatency: trendData.length > 0
        ? trendData.reduce((sum, d) => sum + d.avgLatency, 0) / trendData.length
        : 0,
      totalCost: trendData.reduce((sum, d) => sum + d.estimatedCost, 0),
      passRateTrend: calculateTrend(trendData.map(d => d.passRate)),
      latencyTrend: calculateTrend(trendData.map(d => d.avgLatency)),
    };

    return NextResponse.json({
      trends: trendData,
      stats,
      filters: { suiteId, startDate, endDate, limit },
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}

/**
 * Calculate trend direction and percentage change
 */
function calculateTrend(values: number[]): { direction: 'up' | 'down' | 'stable'; percentChange: number } {
  if (values.length < 2) {
    return { direction: 'stable', percentChange: 0 };
  }

  // Compare last value to first value
  const first = values[0];
  const last = values[values.length - 1];

  if (first === 0) {
    return { direction: last > 0 ? 'up' : 'stable', percentChange: 0 };
  }

  const percentChange = ((last - first) / first) * 100;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (percentChange > 5) direction = 'up';
  else if (percentChange < -5) direction = 'down';

  return { direction, percentChange };
}
