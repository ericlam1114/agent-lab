/**
 * API Route: /api/suites
 * Eval Suite Management (Task 73)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../agent-evals/src/db/migrate';
import { evalSuites, suiteTasks, suiteRuns, evals } from '../../../../agent-evals/src/db/schema';
import { eq, desc, count } from 'drizzle-orm';

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

function generateId(): string {
  return `suite_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export async function GET(request: NextRequest) {
  try {
    const db = initDb();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get suites with task counts
    const suiteResults = await db.select()
      .from(evalSuites)
      .orderBy(desc(evalSuites.createdAt))
      .limit(limit)
      .offset(offset);

    // Get task counts for each suite
    const suitesWithCounts = await Promise.all(
      suiteResults.map(async (suite) => {
        const taskCountResult = await db.select({ count: count() })
          .from(suiteTasks)
          .where(eq(suiteTasks.suiteId, suite.id));

        const runCountResult = await db.select({ count: count() })
          .from(suiteRuns)
          .where(eq(suiteRuns.suiteId, suite.id));

        // Get latest run
        const latestRun = await db.select()
          .from(suiteRuns)
          .where(eq(suiteRuns.suiteId, suite.id))
          .orderBy(desc(suiteRuns.createdAt))
          .limit(1);

        return {
          ...suite,
          taskCount: taskCountResult[0]?.count || 0,
          runCount: runCountResult[0]?.count || 0,
          latestRun: latestRun[0] || null,
        };
      })
    );

    // Get total count
    const totalResult = await db.select({ count: count() }).from(evalSuites);
    const total = totalResult[0]?.count || 0;

    return NextResponse.json({
      suites: suitesWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching suites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = initDb();
    const body = await request.json();

    const { name, description, taskConfigs } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const suiteId = generateId();

    // Create suite
    await db.insert(evalSuites).values({
      id: suiteId,
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now,
    });

    // Add tasks if provided
    if (taskConfigs && Array.isArray(taskConfigs)) {
      for (let i = 0; i < taskConfigs.length; i++) {
        const taskConfig = taskConfigs[i];
        await db.insert(suiteTasks).values({
          id: `stask_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          suiteId,
          taskConfig: JSON.stringify(taskConfig),
          order: i,
          createdAt: now,
        });
      }
    }

    // Fetch created suite with task count
    const suite = await db.select()
      .from(evalSuites)
      .where(eq(evalSuites.id, suiteId))
      .limit(1);

    return NextResponse.json({
      suite: {
        ...suite[0],
        taskCount: taskConfigs?.length || 0,
        runCount: 0,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating suite:', error);
    return NextResponse.json(
      { error: 'Failed to create suite' },
      { status: 500 }
    );
  }
}
