/**
 * agenteval run command
 * Execute evaluation suite against an agent
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { parseConfig } from '../config/schema';
import { Evaluator } from '../core/evaluator';
import type { GlobalOptions } from './index';

// Simple progress bar
function createProgressBar(total: number, width: number = 40): {
  update: (current: number, message?: string) => void;
  complete: () => void;
} {
  let lastRendered = '';

  return {
    update(current: number, message?: string) {
      const progress = Math.min(current / total, 1);
      const filled = Math.round(progress * width);
      const empty = width - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      const percent = Math.round(progress * 100);
      const status = message ? ` ${message}` : '';
      const line = `\r[${bar}] ${percent}% (${current}/${total})${status}`;

      if (line !== lastRendered) {
        process.stdout.write(line);
        lastRendered = line;
      }
    },
    complete() {
      process.stdout.write('\n');
    },
  };
}

// Format results as table
function formatTable(results: TaskResult[]): string {
  const headers = ['Task', 'Status', 'Score', 'Trials', 'Passed', 'Details'];
  const rows = results.map((r) => [
    r.taskId.substring(0, 20),
    r.passed ? '✓ PASS' : '✗ FAIL',
    (r.score * 100).toFixed(1) + '%',
    r.totalTrials.toString(),
    r.passedTrials.toString(),
    r.details?.substring(0, 30) || '-',
  ]);

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length))
  );

  // Build table
  const separator = widths.map((w) => '-'.repeat(w + 2)).join('+');
  const formatRow = (cells: string[]) =>
    cells.map((c, i) => ` ${c.padEnd(widths[i])} `).join('|');

  return [
    separator,
    formatRow(headers),
    separator,
    ...rows.map(formatRow),
    separator,
  ].join('\n');
}

// Format results as markdown
function formatMarkdown(results: TaskResult[], evalName: string): string {
  const lines = [
    `# Evaluation Results: ${evalName}`,
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Total Tasks: ${results.length}`,
    `- Passed: ${results.filter((r) => r.passed).length}`,
    `- Failed: ${results.filter((r) => !r.passed).length}`,
    `- Overall Pass Rate: ${(
      (results.filter((r) => r.passed).length / results.length) *
      100
    ).toFixed(1)}%`,
    '',
    '## Task Results',
    '',
    '| Task | Status | Score | Trials | Details |',
    '|------|--------|-------|--------|---------|',
  ];

  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    lines.push(
      `| ${r.taskId} | ${status} | ${(r.score * 100).toFixed(1)}% | ${r.passedTrials}/${r.totalTrials} | ${r.details || '-'} |`
    );
  }

  return lines.join('\n');
}

interface TaskResult {
  taskId: string;
  passed: boolean;
  score: number;
  totalTrials: number;
  passedTrials: number;
  details?: string;
}

export const runCommand = new Command('run')
  .description('Run evaluation suite')
  .option('--tasks <ids>', 'Run specific tasks (comma-separated)')
  .option('--trials <n>', 'Number of trials per task', '3')
  .option('--concurrency <n>', 'Max concurrent tasks', '2')
  .option('--timeout <ms>', 'Task timeout in milliseconds', '120000')
  .option('--no-cache', 'Disable result caching')
  .option('--save <path>', 'Save results to file')
  .option('-q, --quiet', 'Minimal output (for CI)')
  .option('--json-progress', 'Output progress as JSON (for programmatic use)')
  .action(async (options, cmd) => {
    const globalOpts = cmd.parent?.opts() as GlobalOptions;
    const configPath = globalOpts?.config || 'agenteval.yaml';
    const verbose = globalOpts?.verbose || false;
    const outputFormat = globalOpts?.outputFormat || 'table';

    // Check config file exists
    const fullConfigPath = path.resolve(process.cwd(), configPath);
    if (!fs.existsSync(fullConfigPath)) {
      console.error(`\n❌ Config file not found: ${configPath}`);
      console.error('Run "agenteval init" to create one.\n');
      process.exit(1);
    }

    // Parse config
    const configContent = fs.readFileSync(fullConfigPath, 'utf-8');
    let config;
    try {
      config = parseConfig(configContent);
    } catch (error) {
      console.error(`\n❌ Invalid config file: ${configPath}`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    // Filter tasks if specified
    if (options.tasks) {
      const taskIds = options.tasks.split(',').map((id: string) => id.trim());
      config.tasks = config.tasks.filter((t) => taskIds.includes(t.id));

      if (config.tasks.length === 0) {
        console.error(`\n❌ No tasks found matching: ${options.tasks}`);
        process.exit(1);
      }
    }

    // Override settings from CLI - ensure all required fields have defaults
    const baseSettings = {
      timeout: 60000,
      retries: 3,
      trialsPerTask: 1,
      maxConcurrency: 5,
      passThreshold: 0.5,
      stopOnFailure: false,
      randomizeOrder: false,
      ...config.settings,
    };
    config.settings = {
      ...baseSettings,
      trialsPerTask: parseInt(options.trials, 10),
      maxConcurrency: parseInt(options.concurrency, 10),
    };

    if (!options.quiet) {
      console.log(`\n🚀 Running evaluation: ${config.name}`);
      console.log(`   Tasks: ${config.tasks.length}`);
      console.log(`   Trials per task: ${config.settings.trialsPerTask}`);
      console.log(`   Concurrency: ${config.settings.maxConcurrency}\n`);
    }

    // Create progress tracking
    const totalTasks = config.tasks.length;
    let completedTasks = 0;
    const progress = options.quiet ? null : createProgressBar(totalTasks);

    // Run evaluation
    const evaluator = new Evaluator({
      config,
      onProgress: (event) => {
        if (options.jsonProgress) {
          console.log(JSON.stringify(event));
        } else if (progress) {
          if (event.status === 'running' && event.completedTasks > completedTasks) {
            completedTasks = event.completedTasks;
            progress.update(completedTasks, event.currentTaskId);
          }
        }

        if (verbose && !options.jsonProgress) {
          console.log(`[progress] ${JSON.stringify(event)}`);
        }
      },
    });

    try {
      const evalResults = await evaluator.run();
      progress?.complete();

      // Transform results for display
      const taskResults: TaskResult[] = evalResults.taskResults.map((tr) => ({
        taskId: tr.taskId,
        passed: tr.passed,
        score: tr.score,
        totalTrials: 1, // Single trial for now
        passedTrials: tr.passed ? 1 : 0,
        details: tr.graderResults?.[0]?.details,
      }));

      // Determine if evaluation passed (using passThreshold from settings)
      const evalPassed = evalResults.passRate >= (config.settings.passThreshold ?? 0.5);

      // Output results
      if (options.quiet) {
        // Just output pass/fail for CI
        console.log(evalPassed ? 'PASSED' : 'FAILED');
      } else {
        console.log('\n📊 Results:\n');

        if (outputFormat === 'json') {
          console.log(JSON.stringify(evalResults, null, 2));
        } else if (outputFormat === 'markdown') {
          console.log(formatMarkdown(taskResults, config.name));
        } else {
          console.log(formatTable(taskResults));
        }

        // Summary
        const passRatePercent = (evalResults.passRate * 100).toFixed(1);

        console.log(`\n📈 Summary:`);
        console.log(`   Pass Rate: ${passRatePercent}%`);
        console.log(`   Total Time: ${(evalResults.totalDurationMs / 1000).toFixed(1)}s`);
        console.log(`   Status: ${evalPassed ? '✓ PASSED' : '✗ FAILED'}\n`);
      }

      // Save results if requested
      if (options.save) {
        const savePath = path.resolve(process.cwd(), options.save);
        let saveContent: string;

        if (options.save.endsWith('.md')) {
          saveContent = formatMarkdown(taskResults, config.name);
        } else {
          saveContent = JSON.stringify(evalResults, null, 2);
        }

        fs.writeFileSync(savePath, saveContent);
        if (!options.quiet) {
          console.log(`💾 Results saved to: ${savePath}\n`);
        }
      }

      // Exit with appropriate code
      process.exit(evalPassed ? 0 : 1);
    } catch (error) {
      console.error('\n❌ Evaluation failed:');
      console.error(error instanceof Error ? error.message : String(error));

      if (verbose && error instanceof Error) {
        console.error(error.stack);
      }

      process.exit(1);
    }
  });
