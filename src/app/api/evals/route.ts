/**
 * API Route: /api/evals
 * List and create evaluations (Task 51)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../agent-evals/src/db';
import { evals, tasks } from '../../../../agent-evals/src/db/schema';
import { desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const db = getDb();
    const offset = (page - 1) * limit;

    // Get all evals
    const query = db.select().from(evals).orderBy(desc(evals.createdAt));

    const allEvals = await query;

    // Filter in memory for now (can optimize with SQL later)
    let filteredEvals = allEvals;

    if (status) {
      filteredEvals = filteredEvals.filter((e) => e.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvals = filteredEvals.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description?.toLowerCase().includes(searchLower)
      );
    }

    // Paginate
    const total = filteredEvals.length;
    const paginatedEvals = filteredEvals.slice(offset, offset + limit);

    // Calculate stats
    const stats = {
      total: allEvals.length,
      running: allEvals.filter((e) => e.status === 'running').length,
      completed: allEvals.filter((e) => e.status === 'completed').length,
      failed: allEvals.filter((e) => e.status === 'failed').length,
      avgPassRate:
        allEvals.length > 0
          ? allEvals.reduce((sum, e) => sum + (e.passedTrials / (e.totalTrials || 1)), 0) /
            allEvals.length
          : 0,
    };

    return NextResponse.json({
      evals: paginatedEvals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching evals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evals - Create a new evaluation from wizard
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, agent, tasks: taskConfigs, graders } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Evaluation name is required' },
        { status: 400 }
      );
    }

    if (!agent || !agent.endpoint) {
      return NextResponse.json(
        { error: 'Agent endpoint is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const evalId = uuidv4();

    // Create the evaluation config
    const config = {
      name,
      description: description || '',
      agent: {
        type: agent.type || 'http',
        endpoint: agent.endpoint,
        headers: agent.headers || {},
        timeout: agent.timeout || 30000,
      },
      graders: graders || [],
    };

    // Insert the evaluation
    await db.insert(evals).values({
      id: evalId,
      name,
      description: description || null,
      config: JSON.stringify(config),
      status: 'pending',
      totalTasks: taskConfigs?.length || 0,
      completedTasks: 0,
      totalTrials: 0,
      passedTrials: 0,
      createdAt: new Date().toISOString(),
    });

    // Insert tasks if provided
    if (taskConfigs && Array.isArray(taskConfigs)) {
      for (let i = 0; i < taskConfigs.length; i++) {
        const taskConfig = taskConfigs[i];
        const taskId = uuidv4();

        await db.insert(tasks).values({
          id: taskId,
          evalId,
          description: taskConfig.description || `Task ${i + 1}`,
          type: 'prompt',
          input: JSON.stringify({
            prompt: taskConfig.input || '',
            variables: taskConfig.variables || {},
          }),
          graders: JSON.stringify(graders || []),
          metrics: JSON.stringify({}),
        });
      }
    }

    return NextResponse.json({
      id: evalId,
      name,
      status: 'pending',
      message: 'Evaluation created successfully',
    });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create evaluation' },
      { status: 500 }
    );
  }
}
