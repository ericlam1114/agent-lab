/**
 * API Route: /api/datasets
 * Manage evaluation datasets with database persistence (Task 64)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../agent-evals/src/db/migrate';
import { datasets, datasetRows } from '../../../../agent-evals/src/db/schema';
import { eq, like, desc, sql } from 'drizzle-orm';

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

export async function GET(request: NextRequest) {
  try {
    const db = initDb();
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Search
    const search = searchParams.get('search') || '';

    // Build query
    let query = db.select().from(datasets);

    if (search) {
      query = query.where(like(datasets.name, `%${search}%`)) as typeof query;
    }

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(datasets);
    const total = countResult[0]?.count || 0;

    // Get paginated results
    const results = await query
      .orderBy(desc(datasets.createdAt))
      .limit(limit)
      .offset(offset);

    // For each dataset, get the rows
    const datasetsWithRows = await Promise.all(
      results.map(async (dataset) => {
        const rows = await db.select()
          .from(datasetRows)
          .where(eq(datasetRows.datasetId, dataset.id))
          .orderBy(datasetRows.rowIndex);

        return {
          ...dataset,
          variables: JSON.parse(dataset.variables),
          rows: rows.map(r => JSON.parse(r.data)),
        };
      })
    );

    return NextResponse.json({
      datasets: datasetsWithRows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch datasets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = initDb();
    const body = await request.json();
    const { name, description, variables, rows } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Dataset name is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const datasetId = uuidv4();
    const datasetVars = variables || [];
    const datasetRowsData = rows || [];

    // Insert the dataset
    await db.insert(datasets).values({
      id: datasetId,
      name,
      description: description || '',
      variables: JSON.stringify(datasetVars),
      rowCount: datasetRowsData.length,
      createdAt: now,
      updatedAt: now,
    });

    // Insert the rows
    if (datasetRowsData.length > 0) {
      const rowInserts = datasetRowsData.map((rowData: Record<string, string>, index: number) => ({
        id: uuidv4(),
        datasetId,
        rowIndex: index,
        data: JSON.stringify(rowData),
        createdAt: now,
      }));

      await db.insert(datasetRows).values(rowInserts);
    }

    return NextResponse.json({
      id: datasetId,
      name,
      description: description || '',
      variables: datasetVars,
      rows: datasetRowsData,
      rowCount: datasetRowsData.length,
      createdAt: now,
      updatedAt: now,
      message: 'Dataset created successfully',
    });
  } catch (error) {
    console.error('Error creating dataset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create dataset' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = initDb();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Dataset ID is required' },
        { status: 400 }
      );
    }

    // Delete dataset (rows will cascade)
    await db.delete(datasets).where(eq(datasets.id, id));

    return NextResponse.json({
      message: 'Dataset deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    return NextResponse.json(
      { error: 'Failed to delete dataset' },
      { status: 500 }
    );
  }
}
