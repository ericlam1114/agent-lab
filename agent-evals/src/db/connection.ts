/**
 * Database Connection
 * SQLite with better-sqlite3 driver
 */

import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Default database path
const DEFAULT_DB_DIR = '.agentevals';
const DEFAULT_DB_NAME = 'evals.db';

// Type for our database instance with schema
type DbInstance = BetterSQLite3Database<typeof schema>;

let dbInstance: DbInstance | null = null;
let sqliteInstance: Database.Database | null = null;

export interface DbOptions {
  /** Custom path for the database file */
  dbPath?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Run in memory (for testing) */
  inMemory?: boolean;
}

/**
 * Get or create the database connection
 */
export function getDb(options: DbOptions = {}): DbInstance {
  if (dbInstance) {
    return dbInstance;
  }

  const { dbPath, verbose = false, inMemory = false } = options;

  let fullPath: string;

  if (inMemory) {
    fullPath = ':memory:';
  } else if (dbPath) {
    fullPath = dbPath;
  } else {
    // Default: .agentevals/evals.db in current working directory
    const dbDir = join(process.cwd(), DEFAULT_DB_DIR);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    fullPath = join(dbDir, DEFAULT_DB_NAME);
  }

  sqliteInstance = new Database(fullPath, {
    verbose: verbose ? console.log : undefined,
  });

  // Enable WAL mode for better concurrent performance
  sqliteInstance.pragma('journal_mode = WAL');

  dbInstance = drizzle(sqliteInstance, { schema });

  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
  }
}

/**
 * Reset the database (for testing)
 */
export function resetDb(): void {
  closeDb();
  dbInstance = null;
}

/**
 * Get the raw SQLite instance (for migrations)
 */
export function getSqlite(): Database.Database | null {
  return sqliteInstance;
}
