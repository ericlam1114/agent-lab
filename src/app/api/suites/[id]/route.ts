/**
 * API Route: /api/suites/[id]
 * Individual suite operations (Task 73)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../../agent-evals/src/db/migrate';
import { evalSuites, suiteTasks, suiteRuns } from '../../../../../agent-evals/src/db/schema';
import { eq, desc } from 'drizzle-orm';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;

    // Get suite
    const suiteResults = await db.select()
      .from(evalSuites)
      .where(eq(evalSuites.id, id))
      .limit(1);

    if (suiteResults.length === 0) {
      return NextResponse.json(
        { error: 'Suite not found' },
        { status: 404 }
      );
    }

    const suite = suiteResults[0];

    // Get tasks
    const tasks = await db.select()
      .from(suiteTasks)
      .where(eq(suiteTasks.suiteId, id))
      .orderBy(suiteTasks.order);

    // Get runs
    const runs = await db.select()
      .from(suiteRuns)
      .where(eq(suiteRuns.suiteId, id))
      .orderBy(desc(suiteRuns.createdAt))
      .limit(10);

    return NextResponse.json({
      suite: {
        ...suite,
        tasks: tasks.map(t => ({
          ...t,
          taskConfig: JSON.parse(t.taskConfig),
        })),
        runs: runs.map(r => ({
          ...r,
          results: r.results ? JSON.parse(r.results) : null,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching suite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suite' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;
    const body = await request.json();

    const { name, description, taskConfigs } = body;

    // Check if suite exists
    const existing = await db.select()
      .from(evalSuites)
      .where(eq(evalSuites.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Suite not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Update suite
    await db.update(evalSuites)
      .set({
        name: name || existing[0].name,
        description: description !== undefined ? description : existing[0].description,
        updatedAt: now,
      })
      .where(eq(evalSuites.id, id));

    // Update tasks if provided
    if (taskConfigs && Array.isArray(taskConfigs)) {
      // Delete existing tasks
      await db.delete(suiteTasks).where(eq(suiteTasks.suiteId, id));

      // Add new tasks
      for (let i = 0; i < taskConfigs.length; i++) {
        const taskConfig = taskConfigs[i];
        await db.insert(suiteTasks).values({
          id: `stask_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          suiteId: id,
          taskConfig: JSON.stringify(taskConfig),
          order: i,
          createdAt: now,
        });
      }
    }

    // Fetch updated suite
    const updated = await db.select()
      .from(evalSuites)
      .where(eq(evalSuites.id, id))
      .limit(1);

    const tasks = await db.select()
      .from(suiteTasks)
      .where(eq(suiteTasks.suiteId, id))
      .orderBy(suiteTasks.order);

    return NextResponse.json({
      suite: {
        ...updated[0],
        tasks: tasks.map(t => ({
          ...t,
          taskConfig: JSON.parse(t.taskConfig),
        })),
      },
    });
  } catch (error) {
    console.error('Error updating suite:', error);
    return NextResponse.json(
      { error: 'Failed to update suite' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;

    // Check if suite exists
    const existing = await db.select()
      .from(evalSuites)
      .where(eq(evalSuites.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Suite not found' },
        { status: 404 }
      );
    }

    // Delete suite (cascade will delete tasks and runs)
    await db.delete(evalSuites).where(eq(evalSuites.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting suite:', error);
    return NextResponse.json(
      { error: 'Failed to delete suite' },
      { status: 500 }
    );
  }
}

// Run suite endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;

    // Check if suite exists
    const suiteResults = await db.select()
      .from(evalSuites)
      .where(eq(evalSuites.id, id))
      .limit(1);

    if (suiteResults.length === 0) {
      return NextResponse.json(
        { error: 'Suite not found' },
        { status: 404 }
      );
    }

    // Get tasks
    const tasks = await db.select()
      .from(suiteTasks)
      .where(eq(suiteTasks.suiteId, id))
      .orderBy(suiteTasks.order);

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: 'Suite has no tasks' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create run record
    await db.insert(suiteRuns).values({
      id: runId,
      suiteId: id,
      status: 'running',
      results: JSON.stringify({
        tasksTotal: tasks.length,
        tasksCompleted: 0,
        passRate: 0,
      }),
      createdAt: now,
      completedAt: null,
    });

    // Mock execution (in production, this would trigger actual eval runs)
    // For demo purposes, simulate completion after a delay
    setTimeout(async () => {
      const mockResults = {
        tasksTotal: tasks.length,
        tasksCompleted: tasks.length,
        passRate: 0.7 + Math.random() * 0.25,
        passAtK: { 1: 0.7, 3: 0.85, 5: 0.92 },
        avgLatency: 200 + Math.random() * 100,
        taskResults: tasks.map((t, i) => ({
          taskId: t.id,
          passed: Math.random() > 0.3,
          score: 0.5 + Math.random() * 0.5,
        })),
      };

      await db.update(suiteRuns)
        .set({
          status: 'completed',
          results: JSON.stringify(mockResults),
          completedAt: new Date().toISOString(),
        })
        .where(eq(suiteRuns.id, runId));
    }, 3000);

    return NextResponse.json({
      run: {
        id: runId,
        suiteId: id,
        status: 'running',
        createdAt: now,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error running suite:', error);
    return NextResponse.json(
      { error: 'Failed to run suite' },
      { status: 500 }
    );
  }
}
