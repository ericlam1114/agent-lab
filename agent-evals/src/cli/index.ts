#!/usr/bin/env node
/**
 * Agent Evals CLI
 * Main entry point for the command-line interface
 */

import { Command } from 'commander';
import { initCommand } from './init';
import { runCommand } from './run';
import { viewCommand } from './view';

// Global options interface
export interface GlobalOptions {
  config: string;
  verbose: boolean;
  outputFormat: 'json' | 'table' | 'markdown';
}

const program = new Command();

program
  .name('agenteval')
  .description('Agent Evaluation Framework - Evaluate AI agents with confidence')
  .version('0.1.0')
  .option('-c, --config <path>', 'Path to config file', 'agenteval.yaml')
  .option('-v, --verbose', 'Enable verbose output', false)
  .option(
    '-o, --output-format <format>',
    'Output format (json, table, markdown)',
    'table'
  );

// Add commands
program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(viewCommand);

// Parse and execute
program.parse();
