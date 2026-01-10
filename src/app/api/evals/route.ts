/**
 * API Route: /api/evals
 * List all evaluations
 */

import { NextResponse } from 'next/server';
import { getDb } from '../../../../agent-evals/src/db';
import { evals } from '../../../../agent-evals/src/db/schema';
import { desc } from 'drizzle-orm';

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
