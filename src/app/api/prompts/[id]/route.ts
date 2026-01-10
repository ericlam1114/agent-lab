/**
 * API Route: /api/prompts/[id]
 * Individual prompt operations with version history (Task 65)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../../agent-evals/src/db/migrate';
import { prompts, promptVersions } from '../../../../../agent-evals/src/db/schema';
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

/**
 * Extract variables from template using {{variable}} syntax
 */
function extractVariables(template: string): string[] {
  const variableMatches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(variableMatches.map(m => m.slice(2, -2)))];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;

    // Get prompt
    const prompt = await db.select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1);

    if (prompt.length === 0) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Get version history
    const versions = await db.select()
      .from(promptVersions)
      .where(eq(promptVersions.promptId, id))
      .orderBy(desc(promptVersions.version));

    return NextResponse.json({
      ...prompt[0],
      variables: JSON.parse(prompt[0].variables),
      versions: versions.map(v => ({
        ...v,
        variables: JSON.parse(v.variables),
      })),
    });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
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
    const { name, description, template, changeNote } = body;

    // Check if prompt exists
    const existing = await db.select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const currentPrompt = existing[0];
    const newTemplate = template || currentPrompt.template;
    const variables = extractVariables(newTemplate);
    const templateChanged = template && template !== currentPrompt.template;

    // If template changed, create a new version
    let newVersion = currentPrompt.currentVersion;
    if (templateChanged) {
      newVersion = currentPrompt.currentVersion + 1;

      await db.insert(promptVersions).values({
        id: uuidv4(),
        promptId: id,
        version: newVersion,
        template: newTemplate,
        variables: JSON.stringify(variables),
        changeNote: changeNote || `Version ${newVersion}`,
        createdAt: now,
      });
    }

    // Update prompt
    await db.update(prompts)
      .set({
        name: name || currentPrompt.name,
        description: description !== undefined ? description : currentPrompt.description,
        template: newTemplate,
        variables: JSON.stringify(variables),
        currentVersion: newVersion,
        updatedAt: now,
      })
      .where(eq(prompts.id, id));

    return NextResponse.json({
      id,
      name: name || currentPrompt.name,
      description: description !== undefined ? description : currentPrompt.description,
      template: newTemplate,
      variables,
      currentVersion: newVersion,
      updatedAt: now,
      message: templateChanged
        ? `Prompt updated. New version ${newVersion} created.`
        : 'Prompt updated successfully',
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update prompt' },
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

    // Check if prompt exists
    const existing = await db.select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
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
