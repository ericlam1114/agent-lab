/**
 * API Route: /api/prompts
 * Manage prompt templates (Task 51)
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for now (can be moved to DB later)
let prompts: Array<{
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}> = [];

export async function GET() {
  try {
    return NextResponse.json({
      prompts,
      total: prompts.length,
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

    // Extract variables from template ({{variable}} syntax)
    const variableMatches = template.match(/\{\{(\w+)\}\}/g) || [];
    const variables = [...new Set(variableMatches.map(m => m.slice(2, -2)))];

    const prompt = {
      id: uuidv4(),
      name,
      description: description || '',
      template,
      variables,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    prompts.push(prompt);

    return NextResponse.json({
      ...prompt,
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
