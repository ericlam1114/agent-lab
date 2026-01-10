/**
 * Agent Evals Framework
 *
 * A comprehensive evaluation framework for AI agents,
 * inspired by promptfoo and Anthropic's agent evaluation research.
 *
 * @packageDocumentation
 */

// Core types (primary types for the framework)
// Export everything except Transcript and TranscriptMessage which conflict with core
export {
  type AgentType,
  type AgentConfig,
  type TaskConfig,
  type TaskInput,
  type Message,
  type EnvironmentConfig,
  type GraderType,
  type GraderConfig,
  type EvalConfig,
  type EvalSettings,
  type AgentResponse,
  type ToolCall,
  type TokenUsage,
  type Trial,
  type TrialTranscript,
  type TrialTranscriptMessage,
  type Outcome,
  type GraderResult,
  type EvalResult,
  type EvalSummary,
  type EvalMetrics,
  type EvalProgress as TypesEvalProgress,
  type EvalEvent,
} from './types';

// Core evaluation engine - Transcript class and related types
export {
  // Task Runner
  TaskRunner,
  TaskError,
  TaskTimeoutError,
  TaskExecutionError,
  createTaskRunner,
  type TaskResult,
  type TaskMetrics,
  type TaskErrorInfo,
  // Transcript
  Transcript,
  type MessageRole,
  type TranscriptMessage,
  type ToolCallRecord,
  type ToolResultRecord,
  type TranscriptData,
  // Evaluator
  Evaluator,
  createEvaluator,
  runEvaluation,
  type EvaluatorConfig,
  type EvaluatorResult,
  type TaskEvalResult,
  type EvalProgress,
  type ProgressCallback,
  // Trial Manager
  TrialManager,
  createTrialManager,
  calculatePassAtK,
  calculatePassToTheK,
  type TrialManagerConfig,
  type TrialResult,
  type TaskTrialResults,
  type TrialCallback,
} from './core';

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
