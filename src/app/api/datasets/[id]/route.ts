/**
 * API Route: /api/datasets/[id]
 * Individual dataset operations with import/export (Task 64)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../../agent-evals/src/db/migrate';
import { datasets, datasetRows } from '../../../../../agent-evals/src/db/schema';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format'); // 'json' | 'csv'

    // Get dataset
    const dataset = await db.select()
      .from(datasets)
      .where(eq(datasets.id, id))
      .limit(1);

    if (dataset.length === 0) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // Get rows
    const rows = await db.select()
      .from(datasetRows)
      .where(eq(datasetRows.datasetId, id))
      .orderBy(datasetRows.rowIndex);

    const variables = JSON.parse(dataset[0].variables);
    const rowData = rows.map(r => JSON.parse(r.data));

    // Export as CSV
    if (format === 'csv') {
      const csvHeader = variables.join(',');
      const csvRows = rowData.map((row: Record<string, string>) =>
        variables.map((v: string) => `"${(row[v] || '').replace(/"/g, '""')}"`).join(',')
      );
      const csv = [csvHeader, ...csvRows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${dataset[0].name}.csv"`,
        },
      });
    }

    // Export as JSON
    if (format === 'json') {
      const exportData = {
        name: dataset[0].name,
        description: dataset[0].description,
        variables,
        rows: rowData,
        exportedAt: new Date().toISOString(),
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${dataset[0].name}.json"`,
        },
      });
    }

    // Default: return dataset with rows
    return NextResponse.json({
      ...dataset[0],
      variables,
      rows: rowData,
    });
  } catch (error) {
    console.error('Error fetching dataset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dataset' },
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
    const { name, description, variables, rows } = body;

    // Check if dataset exists
    const existing = await db.select()
      .from(datasets)
      .where(eq(datasets.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Update dataset
    await db.update(datasets)
      .set({
        name: name || existing[0].name,
        description: description !== undefined ? description : existing[0].description,
        variables: variables ? JSON.stringify(variables) : existing[0].variables,
        rowCount: rows ? rows.length : existing[0].rowCount,
        updatedAt: now,
      })
      .where(eq(datasets.id, id));

    // If rows provided, replace all rows
    if (rows) {
      // Delete existing rows
      await db.delete(datasetRows).where(eq(datasetRows.datasetId, id));

      // Insert new rows
      if (rows.length > 0) {
        const rowInserts = rows.map((rowData: Record<string, string>, index: number) => ({
          id: uuidv4(),
          datasetId: id,
          rowIndex: index,
          data: JSON.stringify(rowData),
          createdAt: now,
        }));

        await db.insert(datasetRows).values(rowInserts);
      }
    }

    return NextResponse.json({
      id,
      name: name || existing[0].name,
      description: description !== undefined ? description : existing[0].description,
      variables: variables || JSON.parse(existing[0].variables),
      rowCount: rows ? rows.length : existing[0].rowCount,
      updatedAt: now,
      message: 'Dataset updated successfully',
    });
  } catch (error) {
    console.error('Error updating dataset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update dataset' },
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
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    // Check if dataset exists
    const existing = await db.select()
      .from(datasets)
      .where(eq(datasets.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // If taskId is provided, delete a single row from the dataset
    if (taskId) {
      // Delete the specific row
      await db.delete(datasetRows)
        .where(eq(datasetRows.id, taskId));

      // Update row count
      const remainingRows = await db.select()
        .from(datasetRows)
        .where(eq(datasetRows.datasetId, id));

      await db.update(datasets)
        .set({
          rowCount: remainingRows.length,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(datasets.id, id));

      return NextResponse.json({
        success: true,
        deletedTaskId: taskId,
      });
    }

    // Delete entire dataset (rows will cascade)
    await db.delete(datasets).where(eq(datasets.id, id));

    return NextResponse.json({
      message: 'Dataset deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting from dataset:', error);
    return NextResponse.json(
      { error: 'Failed to delete from dataset' },
      { status: 500 }
    );
  }
}
