/**
 * API Route: /api/baselines
 * Manage evaluation baselines for regression tracking (Task 66)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../agent-evals/src/db/migrate';
import { baselines, evals, tasks, trials } from '../../../../agent-evals/src/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

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
 * Calculate metrics for an eval to store as baseline
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
      // Simplified pass@k: probability of at least 1 success in k trials
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

// GET - List all baselines
export async function GET(request: NextRequest) {
  try {
    const db = initDb();
    const searchParams = request.nextUrl.searchParams;

    const suiteId = searchParams.get('suiteId');

    let query = db.select().from(baselines);

    if (suiteId) {
      query = query.where(eq(baselines.suiteId, suiteId)) as typeof query;
    }

    const results = await query.orderBy(desc(baselines.createdAt));

    // Parse metrics JSON
    const baselinesWithMetrics = results.map(b => ({
      ...b,
      metrics: JSON.parse(b.metrics),
    }));

    return NextResponse.json({
      baselines: baselinesWithMetrics,
      total: baselinesWithMetrics.length,
    });
  } catch (error) {
    console.error('Error fetching baselines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch baselines' },
      { status: 500 }
    );
  }
}

// POST - Create a new baseline from an eval
export async function POST(request: NextRequest) {
  try {
    const db = initDb();
    const body = await request.json();
    const { evalId, name, description, suiteId, isDefault } = body;

    if (!evalId) {
      return NextResponse.json(
        { error: 'Eval ID is required' },
        { status: 400 }
      );
    }

    // Calculate metrics for the eval
    const metrics = await calculateEvalMetrics(db, evalId);

    const now = new Date().toISOString();
    const baselineId = uuidv4();

    // If this is being set as default, clear other defaults for this suite
    if (isDefault && suiteId) {
      await db.update(baselines)
        .set({ isDefault: false })
        .where(eq(baselines.suiteId, suiteId));
    }

    // Insert the baseline
    await db.insert(baselines).values({
      id: baselineId,
      name: name || `Baseline from ${metrics.evalName}`,
      description: description || '',
      evalId,
      suiteId: suiteId || null,
      metrics: JSON.stringify(metrics),
      isDefault: isDefault || false,
      createdAt: now,
    });

    return NextResponse.json({
      id: baselineId,
      name: name || `Baseline from ${metrics.evalName}`,
      description: description || '',
      evalId,
      suiteId,
      metrics,
      isDefault: isDefault || false,
      createdAt: now,
      message: 'Baseline created successfully',
    });
  } catch (error) {
    console.error('Error creating baseline:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create baseline' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a baseline
export async function DELETE(request: NextRequest) {
  try {
    const db = initDb();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Baseline ID is required' },
        { status: 400 }
      );
    }

    await db.delete(baselines).where(eq(baselines.id, id));

    return NextResponse.json({
      message: 'Baseline deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting baseline:', error);
    return NextResponse.json(
      { error: 'Failed to delete baseline' },
      { status: 500 }
    );
  }
}
