#!/usr/bin/env node
/**
 * Agent Evals CLI
 * Main entry point for the command-line interface
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('agenteval')
  .description('Agent Evaluation Framework - Evaluate AI agents with confidence')
  .version('0.1.0');

// Commands will be added in subsequent tasks:
// - init: Generate config file interactively
// - run: Execute evaluation suite
// - view: Start web viewer server

program.parse();
