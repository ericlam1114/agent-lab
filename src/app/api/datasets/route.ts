/**
 * API Route: /api/datasets
 * Manage evaluation datasets (Task 51)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for now (can be moved to DB later)
let datasets: Array<{
  id: string;
  name: string;
  description: string;
  variables: string[];
  rows: Array<Record<string, string>>;
  createdAt: string;
  updatedAt: string;
}> = [];

export async function GET() {
  try {
    return NextResponse.json({
      datasets,
      total: datasets.length,
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
    const body = await request.json();
    const { name, description, variables, rows } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Dataset name is required' },
        { status: 400 }
      );
    }

    const dataset = {
      id: uuidv4(),
      name,
      description: description || '',
      variables: variables || [],
      rows: rows || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    datasets.push(dataset);

    return NextResponse.json({
      ...dataset,
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
