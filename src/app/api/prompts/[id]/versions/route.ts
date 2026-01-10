/**
 * API Route: /api/prompts/[id]/versions
 * Manage prompt version history - view and restore versions (Task 65)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../../../../../agent-evals/src/db/connection';
import { runMigrations } from '../../../../../../agent-evals/src/db/migrate';
import { prompts, promptVersions } from '../../../../../../agent-evals/src/db/schema';
import { eq, desc, and } from 'drizzle-orm';

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

// GET - List all versions for a prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;

    // Check if prompt exists
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

    // Get all versions
    const versions = await db.select()
      .from(promptVersions)
      .where(eq(promptVersions.promptId, id))
      .orderBy(desc(promptVersions.version));

    return NextResponse.json({
      promptId: id,
      promptName: prompt[0].name,
      currentVersion: prompt[0].currentVersion,
      versions: versions.map(v => ({
        ...v,
        variables: JSON.parse(v.variables),
        isCurrent: v.version === prompt[0].currentVersion,
      })),
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST - Restore a specific version (creates a new version with restored content)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = initDb();
    const { id } = await params;
    const body = await request.json();
    const { version: restoreVersion } = body;

    if (!restoreVersion || typeof restoreVersion !== 'number') {
      return NextResponse.json(
        { error: 'Version number is required' },
        { status: 400 }
      );
    }

    // Check if prompt exists
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

    // Get the version to restore
    const versionToRestore = await db.select()
      .from(promptVersions)
      .where(and(
        eq(promptVersions.promptId, id),
        eq(promptVersions.version, restoreVersion)
      ))
      .limit(1);

    if (versionToRestore.length === 0) {
      return NextResponse.json(
        { error: `Version ${restoreVersion} not found` },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const newVersion = prompt[0].currentVersion + 1;
    const restoredTemplate = versionToRestore[0].template;
    const variables = extractVariables(restoredTemplate);

    // Create a new version with the restored content
    await db.insert(promptVersions).values({
      id: uuidv4(),
      promptId: id,
      version: newVersion,
      template: restoredTemplate,
      variables: JSON.stringify(variables),
      changeNote: `Restored from version ${restoreVersion}`,
      createdAt: now,
    });

    // Update the prompt to use the restored content
    await db.update(prompts)
      .set({
        template: restoredTemplate,
        variables: JSON.stringify(variables),
        currentVersion: newVersion,
        updatedAt: now,
      })
      .where(eq(prompts.id, id));

    return NextResponse.json({
      id,
      template: restoredTemplate,
      variables,
      currentVersion: newVersion,
      restoredFrom: restoreVersion,
      message: `Version ${restoreVersion} restored as version ${newVersion}`,
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to restore version' },
      { status: 500 }
    );
  }
}
