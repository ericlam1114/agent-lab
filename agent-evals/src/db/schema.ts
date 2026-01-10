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
