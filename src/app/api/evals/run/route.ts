/**
 * API Route: Run Evaluation
 * POST /api/evals/run
 * Triggers an evaluation run from the GUI
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { resolve } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configPath } = body;

    if (!configPath) {
      return NextResponse.json(
        { error: 'Config path is required' },
        { status: 400 }
      );
    }

    // Resolve the config path
    const resolvedPath = resolve(process.cwd(), configPath);

    // Check if config file exists
    if (!existsSync(resolvedPath)) {
      return NextResponse.json(
        {
          error: `Config file not found: ${configPath}`,
          hint: 'Create a config file with "npx agenteval init" or provide the correct path'
        },
        { status: 404 }
      );
    }

    // For now, we'll return instructions since running evals is typically done via CLI
    // In a full implementation, this would spawn the eval process

    // Option 1: Return instructions for CLI usage
    // This is safer as it doesn't spawn background processes
    return NextResponse.json({
      status: 'instructions',
      name: configPath,
      message: 'To run evaluations, use the CLI command',
      command: `npx agenteval run --config ${configPath}`,
      instructions: [
        'Open a terminal in your project directory',
        `Run: npx agenteval run --config ${configPath}`,
        'The results will appear in this dashboard automatically'
      ]
    });

    // Option 2: Actually spawn the eval process (uncomment to enable)
    /*
    const { spawn } = await import('child_process');

    const evalProcess = spawn('npx', ['agenteval', 'run', '--config', resolvedPath], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore'
    });

    evalProcess.unref();

    return NextResponse.json({
      status: 'started',
      name: configPath,
      message: 'Evaluation started in background',
      pid: evalProcess.pid
    });
    */

  } catch (error) {
    console.error('Error running evaluation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run evaluation' },
      { status: 500 }
    );
  }
}
