/**
 * API Route: /api/baselines/[id]
 * Individual baseline operations (Task 66)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../../agent-evals/src/db/migrate';
import { baselines } from '../../../../../agent-evals/src/db/schema';
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

// GET - Get a specific baseline
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;

    const baseline = await db.select()
      .from(baselines)
      .where(eq(baselines.id, id))
      .limit(1);

    if (baseline.length === 0) {
      return NextResponse.json(
        { error: 'Baseline not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...baseline[0],
      metrics: JSON.parse(baseline[0].metrics),
    });
  } catch (error) {
    console.error('Error fetching baseline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch baseline' },
      { status: 500 }
    );
  }
}

// PUT - Update a baseline
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;
    const body = await request.json();
    const { name, description, isDefault } = body;

    // Check if baseline exists
    const existing = await db.select()
      .from(baselines)
      .where(eq(baselines.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Baseline not found' },
        { status: 404 }
      );
    }

    // If setting as default, clear other defaults for this suite
    if (isDefault && existing[0].suiteId) {
      await db.update(baselines)
        .set({ isDefault: false })
        .where(eq(baselines.suiteId, existing[0].suiteId));
    }

    // Update baseline
    await db.update(baselines)
      .set({
        name: name !== undefined ? name : existing[0].name,
        description: description !== undefined ? description : existing[0].description,
        isDefault: isDefault !== undefined ? isDefault : existing[0].isDefault,
      })
      .where(eq(baselines.id, id));

    return NextResponse.json({
      id,
      name: name !== undefined ? name : existing[0].name,
      description: description !== undefined ? description : existing[0].description,
      isDefault: isDefault !== undefined ? isDefault : existing[0].isDefault,
      message: 'Baseline updated successfully',
    });
  } catch (error) {
    console.error('Error updating baseline:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update baseline' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a baseline
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;

    // Check if baseline exists
    const existing = await db.select()
      .from(baselines)
      .where(eq(baselines.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Baseline not found' },
        { status: 404 }
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
