/**
 * Database Schema for Agent Evals Framework
 * Using Drizzle ORM with SQLite
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// Evals Table - Top-level evaluation runs
// ============================================================================

export const evals = sqliteTable('evals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config').notNull(), // JSON serialized EvalConfig
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed']
  }).notNull().default('pending'),
  agentType: text('agent_type', {
    enum: ['coding', 'conversational', 'research', 'computer-use']
  }),
  totalTasks: integer('total_tasks').notNull().default(0),
  completedTasks: integer('completed_tasks').notNull().default(0),
  passRate: real('pass_rate'),
  avgScore: real('avg_score'),
  totalTrials: integer('total_trials').notNull().default(0),
  passedTrials: integer('passed_trials').notNull().default(0),
  createdAt: text('created_at').notNull(),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  error: text('error'),
});

// ============================================================================
// Tasks Table - Individual test cases within an eval
// ============================================================================

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  evalId: text('eval_id').notNull().references(() => evals.id, { onDelete: 'cascade' }),
  taskIndex: integer('task_index').notNull(), // Order within eval
  description: text('description').notNull(),
  type: text('type', {
    enum: ['coding', 'conversational', 'research', 'computer-use']
  }).notNull(),
  input: text('input').notNull(), // JSON serialized TaskInput
  graders: text('graders').notNull(), // JSON serialized GraderConfig[]
  trackedMetrics: text('tracked_metrics'), // JSON serialized string[]
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed']
  }).notNull().default('pending'),
  avgScore: real('avg_score'),
  passRate: real('pass_rate'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

// ============================================================================
// Trials Table - Individual attempts at a task
// ============================================================================

export const trials = sqliteTable('trials', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  attempt: integer('attempt').notNull(), // Trial number (1, 2, 3, ...)
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed']
  }).notNull().default('pending'),
  score: real('score'),
  passed: integer('passed', { mode: 'boolean' }),
  transcript: text('transcript'), // JSON serialized Transcript
  outcome: text('outcome'), // JSON serialized Outcome
  latencyMs: integer('latency_ms'),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  error: text('error'),
});

// ============================================================================
// Results Table - Grader results for each trial
// ============================================================================

export const results = sqliteTable('results', {
  id: text('id').primaryKey(),
  trialId: text('trial_id').notNull().references(() => trials.id, { onDelete: 'cascade' }),
  graderId: text('grader_id').notNull(),
  graderType: text('grader_type').notNull(),
  score: real('score').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  weight: real('weight').default(1.0),
  details: text('details'), // JSON or text explanation
  error: text('error'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// Datasets Table - Test datasets with variables
// ============================================================================

export const datasets = sqliteTable('datasets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  variables: text('variables').notNull(), // JSON array of variable names
  rowCount: integer('row_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================================================
// Dataset Rows Table - Individual data rows in a dataset
// ============================================================================

export const datasetRows = sqliteTable('dataset_rows', {
  id: text('id').primaryKey(),
  datasetId: text('dataset_id').notNull().references(() => datasets.id, { onDelete: 'cascade' }),
  rowIndex: integer('row_index').notNull(),
  data: text('data').notNull(), // JSON object with variable values
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// Prompts Table - Prompt templates with variables
// ============================================================================

export const prompts = sqliteTable('prompts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  template: text('template').notNull(),
  variables: text('variables').notNull(), // JSON array of variable names
  currentVersion: integer('current_version').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================================================
// Prompt Versions Table - Version history for prompts
// ============================================================================

export const promptVersions = sqliteTable('prompt_versions', {
  id: text('id').primaryKey(),
  promptId: text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  template: text('template').notNull(),
  variables: text('variables').notNull(), // JSON array of variable names
  changeNote: text('change_note'),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// Baselines Table - Baseline evals for regression comparison
// ============================================================================

export const baselines = sqliteTable('baselines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  evalId: text('eval_id').notNull().references(() => evals.id, { onDelete: 'cascade' }),
  suiteId: text('suite_id'), // Optional link to eval suite
  metrics: text('metrics').notNull(), // JSON: { passRate, passAtK, avgLatency, etc. }
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// Eval Suites Table - Group related evals together
// ============================================================================

export const evalSuites = sqliteTable('eval_suites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config'), // JSON: default settings for suite
  baselineId: text('baseline_id'), // Default baseline for the suite
  taskCount: integer('task_count').notNull().default(0),
  lastRunAt: text('last_run_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ============================================================================
// Suite Tasks Table - Tasks that belong to a suite
// ============================================================================

export const suiteTasks = sqliteTable('suite_tasks', {
  id: text('id').primaryKey(),
  suiteId: text('suite_id').notNull().references(() => evalSuites.id, { onDelete: 'cascade' }),
  taskIndex: integer('task_index').notNull(),
  description: text('description').notNull(),
  type: text('type', {
    enum: ['coding', 'conversational', 'research', 'computer-use']
  }).notNull(),
  input: text('input').notNull(), // JSON serialized TaskInput
  graders: text('graders').notNull(), // JSON serialized GraderConfig[]
  datasetId: text('dataset_id').references(() => datasets.id), // Optional dataset reference
  promptId: text('prompt_id').references(() => prompts.id), // Optional prompt reference
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// Suite Runs Table - Track runs of a suite
// ============================================================================

export const suiteRuns = sqliteTable('suite_runs', {
  id: text('id').primaryKey(),
  suiteId: text('suite_id').notNull().references(() => evalSuites.id, { onDelete: 'cascade' }),
  evalId: text('eval_id').notNull().references(() => evals.id, { onDelete: 'cascade' }),
  baselineId: text('baseline_id').references(() => baselines.id),
  regressionStatus: text('regression_status', {
    enum: ['none', 'improved', 'regressed', 'mixed']
  }),
  regressionDetails: text('regression_details'), // JSON: { passRateDelta, latencyDelta, etc. }
  createdAt: text('created_at').notNull(),
});

// ============================================================================
// Human Reviews Table - For human grader queue
// ============================================================================

export const humanReviews = sqliteTable('human_reviews', {
  id: text('id').primaryKey(),
  trialId: text('trial_id').notNull().references(() => trials.id, { onDelete: 'cascade' }),
  graderId: text('grader_id').notNull(),
  status: text('status', {
    enum: ['pending', 'in_progress', 'completed', 'skipped']
  }).notNull().default('pending'),
  assignedTo: text('assigned_to'),
  score: real('score'),
  feedback: text('feedback'),
  createdAt: text('created_at').notNull(),
  assignedAt: text('assigned_at'),
  completedAt: text('completed_at'),
});

// ============================================================================
// Relations
// ============================================================================

export const evalsRelations = relations(evals, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  eval: one(evals, {
    fields: [tasks.evalId],
    references: [evals.id],
  }),
  trials: many(trials),
}));

export const trialsRelations = relations(trials, ({ one, many }) => ({
  task: one(tasks, {
    fields: [trials.taskId],
    references: [tasks.id],
  }),
  results: many(results),
  humanReviews: many(humanReviews),
}));

export const resultsRelations = relations(results, ({ one }) => ({
  trial: one(trials, {
    fields: [results.trialId],
    references: [trials.id],
  }),
}));

export const humanReviewsRelations = relations(humanReviews, ({ one }) => ({
  trial: one(trials, {
    fields: [humanReviews.trialId],
    references: [trials.id],
  }),
}));

// Dataset Relations
export const datasetsRelations = relations(datasets, ({ many }) => ({
  rows: many(datasetRows),
  suiteTasks: many(suiteTasks),
}));

export const datasetRowsRelations = relations(datasetRows, ({ one }) => ({
  dataset: one(datasets, {
    fields: [datasetRows.datasetId],
    references: [datasets.id],
  }),
}));

// Prompt Relations
export const promptsRelations = relations(prompts, ({ many }) => ({
  versions: many(promptVersions),
  suiteTasks: many(suiteTasks),
}));

export const promptVersionsRelations = relations(promptVersions, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptVersions.promptId],
    references: [prompts.id],
  }),
}));

// Baseline Relations
export const baselinesRelations = relations(baselines, ({ one }) => ({
  eval: one(evals, {
    fields: [baselines.evalId],
    references: [evals.id],
  }),
}));

// Eval Suite Relations
export const evalSuitesRelations = relations(evalSuites, ({ many }) => ({
  tasks: many(suiteTasks),
  runs: many(suiteRuns),
}));

export const suiteTasksRelations = relations(suiteTasks, ({ one }) => ({
  suite: one(evalSuites, {
    fields: [suiteTasks.suiteId],
    references: [evalSuites.id],
  }),
  dataset: one(datasets, {
    fields: [suiteTasks.datasetId],
    references: [datasets.id],
  }),
  prompt: one(prompts, {
    fields: [suiteTasks.promptId],
    references: [prompts.id],
  }),
}));

export const suiteRunsRelations = relations(suiteRuns, ({ one }) => ({
  suite: one(evalSuites, {
    fields: [suiteRuns.suiteId],
    references: [evalSuites.id],
  }),
  eval: one(evals, {
    fields: [suiteRuns.evalId],
    references: [evals.id],
  }),
  baseline: one(baselines, {
    fields: [suiteRuns.baselineId],
    references: [baselines.id],
  }),
}));

// ============================================================================
// Type Exports
// ============================================================================

export type Eval = typeof evals.$inferSelect;
export type NewEval = typeof evals.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Trial = typeof trials.$inferSelect;
export type NewTrial = typeof trials.$inferInsert;

export type Result = typeof results.$inferSelect;
export type NewResult = typeof results.$inferInsert;

export type HumanReview = typeof humanReviews.$inferSelect;
export type NewHumanReview = typeof humanReviews.$inferInsert;

export type Dataset = typeof datasets.$inferSelect;
export type NewDataset = typeof datasets.$inferInsert;

export type DatasetRow = typeof datasetRows.$inferSelect;
export type NewDatasetRow = typeof datasetRows.$inferInsert;

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type PromptVersion = typeof promptVersions.$inferSelect;
export type NewPromptVersion = typeof promptVersions.$inferInsert;

export type Baseline = typeof baselines.$inferSelect;
export type NewBaseline = typeof baselines.$inferInsert;

export type EvalSuite = typeof evalSuites.$inferSelect;
export type NewEvalSuite = typeof evalSuites.$inferInsert;

export type SuiteTask = typeof suiteTasks.$inferSelect;
export type NewSuiteTask = typeof suiteTasks.$inferInsert;

export type SuiteRun = typeof suiteRuns.$inferSelect;
export type NewSuiteRun = typeof suiteRuns.$inferInsert;
