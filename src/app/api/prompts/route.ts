/**
 * API Route: /api/prompts
 * Manage prompt templates with database persistence and versioning (Task 65)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../agent-evals/src/db/migrate';
import { prompts, promptVersions } from '../../../../agent-evals/src/db/schema';
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

/**
 * Extract variables from template using {{variable}} syntax
 */
function extractVariables(template: string): string[] {
  const variableMatches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(variableMatches.map(m => m.slice(2, -2)))];
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
    let query = db.select().from(prompts);

    if (search) {
      query = query.where(like(prompts.name, `%${search}%`)) as typeof query;
    }

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(prompts);
    const total = countResult[0]?.count || 0;

    // Get paginated results
    const results = await query
      .orderBy(desc(prompts.createdAt))
      .limit(limit)
      .offset(offset);

    // Parse variables JSON
    const promptsWithParsedVars = results.map(prompt => ({
      ...prompt,
      variables: JSON.parse(prompt.variables),
    }));

    return NextResponse.json({
      prompts: promptsWithParsedVars,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = initDb();
    const body = await request.json();
    const { name, description, template } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Prompt name is required' },
        { status: 400 }
      );
    }

    if (!template || typeof template !== 'string') {
      return NextResponse.json(
        { error: 'Prompt template is required' },
        { status: 400 }
      );
    }

    const variables = extractVariables(template);
    const now = new Date().toISOString();
    const promptId = uuidv4();

    // Insert the prompt
    await db.insert(prompts).values({
      id: promptId,
      name,
      description: description || '',
      template,
      variables: JSON.stringify(variables),
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Create the first version
    await db.insert(promptVersions).values({
      id: uuidv4(),
      promptId,
      version: 1,
      template,
      variables: JSON.stringify(variables),
      changeNote: 'Initial version',
      createdAt: now,
    });

    return NextResponse.json({
      id: promptId,
      name,
      description: description || '',
      template,
      variables,
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
      message: 'Prompt template created successfully',
    });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create prompt' },
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
        { error: 'Prompt ID is required' },
        { status: 400 }
      );
    }

    // Delete prompt (versions will cascade)
    await db.delete(prompts).where(eq(prompts.id, id));

    return NextResponse.json({
      message: 'Prompt deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
