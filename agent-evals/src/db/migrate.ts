/**
 * Database Migration Script
 * Creates all tables if they don't exist
 */

import { getDb, getSqlite } from './connection';

/**
 * Run migrations to create/update database schema
 */
export function runMigrations(): void {
  // Initialize the database connection
  getDb();

  const sqlite = getSqlite();
  if (!sqlite) {
    throw new Error('Database not initialized');
  }

  // Create tables using raw SQL (Drizzle's push functionality)
  // This is a simple migration that creates tables if they don't exist

  sqlite.exec(`
    -- Evals table
    CREATE TABLE IF NOT EXISTS evals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      agent_type TEXT,
      total_tasks INTEGER NOT NULL DEFAULT 0,
      completed_tasks INTEGER NOT NULL DEFAULT 0,
      pass_rate REAL,
      avg_score REAL,
      total_trials INTEGER NOT NULL DEFAULT 0,
      passed_trials INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      error TEXT
    );

    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      eval_id TEXT NOT NULL REFERENCES evals(id) ON DELETE CASCADE,
      task_index INTEGER NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      input TEXT NOT NULL,
      graders TEXT NOT NULL,
      tracked_metrics TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      avg_score REAL,
      pass_rate REAL,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    -- Trials table
    CREATE TABLE IF NOT EXISTS trials (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      attempt INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      score REAL,
      passed INTEGER,
      transcript TEXT,
      outcome TEXT,
      latency_ms INTEGER,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      total_tokens INTEGER,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      error TEXT
    );

    -- Results table
    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      trial_id TEXT NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
      grader_id TEXT NOT NULL,
      grader_type TEXT NOT NULL,
      score REAL NOT NULL,
      passed INTEGER NOT NULL,
      weight REAL DEFAULT 1.0,
      details TEXT,
      error TEXT,
      created_at TEXT NOT NULL
    );

    -- Human reviews table
    CREATE TABLE IF NOT EXISTS human_reviews (
      id TEXT PRIMARY KEY,
      trial_id TEXT NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
      grader_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_to TEXT,
      score REAL,
      feedback TEXT,
      created_at TEXT NOT NULL,
      assigned_at TEXT,
      completed_at TEXT
    );

    -- Datasets table
    CREATE TABLE IF NOT EXISTS datasets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      variables TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Dataset rows table
    CREATE TABLE IF NOT EXISTS dataset_rows (
      id TEXT PRIMARY KEY,
      dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
      row_index INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Prompts table
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      template TEXT NOT NULL,
      variables TEXT NOT NULL,
      current_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Prompt versions table
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      template TEXT NOT NULL,
      variables TEXT NOT NULL,
      change_note TEXT,
      created_at TEXT NOT NULL
    );

    -- Baselines table
    CREATE TABLE IF NOT EXISTS baselines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      eval_id TEXT NOT NULL REFERENCES evals(id) ON DELETE CASCADE,
      suite_id TEXT,
      metrics TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Eval suites table
    CREATE TABLE IF NOT EXISTS eval_suites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      config TEXT,
      baseline_id TEXT,
      task_count INTEGER NOT NULL DEFAULT 0,
      last_run_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Suite tasks table
    CREATE TABLE IF NOT EXISTS suite_tasks (
      id TEXT PRIMARY KEY,
      suite_id TEXT NOT NULL REFERENCES eval_suites(id) ON DELETE CASCADE,
      task_index INTEGER NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      input TEXT NOT NULL,
      graders TEXT NOT NULL,
      dataset_id TEXT REFERENCES datasets(id),
      prompt_id TEXT REFERENCES prompts(id),
      created_at TEXT NOT NULL
    );

    -- Suite runs table
    CREATE TABLE IF NOT EXISTS suite_runs (
      id TEXT PRIMARY KEY,
      suite_id TEXT NOT NULL REFERENCES eval_suites(id) ON DELETE CASCADE,
      eval_id TEXT NOT NULL REFERENCES evals(id) ON DELETE CASCADE,
      baseline_id TEXT REFERENCES baselines(id),
      regression_status TEXT,
      regression_details TEXT,
      created_at TEXT NOT NULL
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_tasks_eval_id ON tasks(eval_id);
    CREATE INDEX IF NOT EXISTS idx_trials_task_id ON trials(task_id);
    CREATE INDEX IF NOT EXISTS idx_results_trial_id ON results(trial_id);
    CREATE INDEX IF NOT EXISTS idx_human_reviews_trial_id ON human_reviews(trial_id);
    CREATE INDEX IF NOT EXISTS idx_human_reviews_status ON human_reviews(status);
    CREATE INDEX IF NOT EXISTS idx_evals_status ON evals(status);
    CREATE INDEX IF NOT EXISTS idx_evals_created_at ON evals(created_at);
    CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset_id ON dataset_rows(dataset_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
    CREATE INDEX IF NOT EXISTS idx_baselines_eval_id ON baselines(eval_id);
    CREATE INDEX IF NOT EXISTS idx_baselines_suite_id ON baselines(suite_id);
    CREATE INDEX IF NOT EXISTS idx_suite_tasks_suite_id ON suite_tasks(suite_id);
    CREATE INDEX IF NOT EXISTS idx_suite_runs_suite_id ON suite_runs(suite_id);
    CREATE INDEX IF NOT EXISTS idx_suite_runs_eval_id ON suite_runs(eval_id);
  `);

  console.log('Database migrations completed successfully');
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}
