/**
 * agenteval view command
 * Start web viewer server for evaluation results
 */

import { Command } from 'commander';
import { exec } from 'child_process';
import type { GlobalOptions } from './index';

// Platform-specific browser open command
function openBrowser(url: string): void {
  const platform = process.platform;
  let command: string;

  switch (platform) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "" "${url}"`;
      break;
    default:
      command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`\n📝 Open manually: ${url}\n`);
    }
  });
}

export const viewCommand = new Command('view')
  .description('Start web viewer for evaluation results')
  .option('-p, --port <port>', 'Server port', '3001')
  .option('--no-open', 'Do not open browser automatically')
  .option('--eval-id <id>', 'View specific evaluation by ID')
  .option('--host <host>', 'Server host', 'localhost')
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent?.opts() as GlobalOptions;
    const verbose = globalOpts?.verbose || false;

    const port = parseInt(options.port, 10);
    const host = options.host;
    const url = `http://${host}:${port}`;

    console.log(`\n🌐 Starting Agent Eval Viewer...`);
    console.log(`   URL: ${url}`);

    if (options.evalId) {
      console.log(`   Eval ID: ${options.evalId}`);
    }

    console.log('\n');

    // For now, we'll start the Next.js dev server
    // In production, this would serve a built version
    const { spawn } = await import('child_process');

    const serverProcess = spawn('npm', ['run', 'dev', '--', '-p', port.toString()], {
      stdio: verbose ? 'inherit' : 'pipe',
      shell: true,
      cwd: process.cwd(),
    });

    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Open browser
    if (options.open !== false) {
      const targetUrl = options.evalId ? `${url}/evals/${options.evalId}` : url;
      console.log(`🔗 Opening browser: ${targetUrl}\n`);
      openBrowser(targetUrl);
    }

    console.log('Press Ctrl+C to stop the server\n');

    // Handle cleanup
    const cleanup = () => {
      console.log('\n\n🛑 Stopping server...');
      serverProcess.kill();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep alive
    serverProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Server exited with code ${code}`);
      }
      process.exit(code || 0);
    });

    // If not verbose, show server output on errors only
    if (!verbose && serverProcess.stderr) {
      serverProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        if (output.includes('error') || output.includes('Error')) {
          console.error(output);
        }
      });
    }

    // Wait indefinitely
    await new Promise(() => {});
  });
