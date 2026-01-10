/**
 * Agent Evals Framework
 *
 * A comprehensive evaluation framework for AI agents,
 * inspired by promptfoo and Anthropic's agent evaluation research.
 *
 * @packageDocumentation
 */

// Core types (primary types for the framework)
export * from './types';

// Core evaluation engine
export * from './core';

// Graders
export * from './graders';

// Agent providers
export * from './providers';

// Agent-type specific evaluators
export * from './agent-types';

// Database - export selectively to avoid naming conflicts with types.ts
export {
  // Connection
  getDb,
  closeDb,
  resetDb,
  getSqlite,
  type DbOptions,
  // Migrations
  runMigrations,
  // Schema tables
  evals,
  tasks,
  trials,
  results,
  humanReviews,
  // Relations
  evalsRelations,
  tasksRelations,
  trialsRelations,
  resultsRelations,
  humanReviewsRelations,
} from './db';

// Re-export DB types with Db prefix to avoid conflicts
export type {
  Eval as DbEval,
  NewEval,
  Task as DbTask,
  NewTask,
  Trial as DbTrial,
  NewTrial,
  Result as DbResult,
  NewResult,
  HumanReview as DbHumanReview,
  NewHumanReview,
} from './db';

// Configuration - export parser functions and schemas
export {
  // Parser functions
  parseConfigString,
  parseConfigFile,
  parseJsonConfig,
  validateConfig,
  mergeConfigs,
  generateSampleConfig,
  ConfigError,
  ConfigValidationError,
  // Schemas (for advanced usage)
  EvalConfigSchema,
  AgentConfigSchema,
  TaskConfigSchema,
  GraderConfigSchema,
  EvalSettingsSchema,
} from './config';

// Config types with Config prefix to distinguish from core types
export type {
  EvalConfig as ParsedEvalConfig,
  AgentConfig as ParsedAgentConfig,
  TaskConfig as ParsedTaskConfig,
  GraderConfig as ParsedGraderConfig,
  EvalSettings as ParsedEvalSettings,
} from './config';
