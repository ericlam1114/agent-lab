/**
 * Caching Layer (Task 34)
 * Hash-based caching for evaluation results
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  hits: number;
}

export interface CacheConfig {
  type: 'memory' | 'file';
  ttlMs: number;
  maxEntries: number;
  cacheDir?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  hitRate: number;
}

// ============================================================================
// Hash Utility
// ============================================================================

export function hashInput(input: unknown): string {
  const json = JSON.stringify(input, Object.keys(input as object).sort());
  return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16);
}

// ============================================================================
// Memory Cache
// ============================================================================

export class MemoryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      type: 'memory',
      ttlMs: config?.ttlMs ?? 3600000, // 1 hour default
      maxEntries: config?.maxEntries ?? 1000,
      ...config,
    };
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxEntries) {
      this.evict();
    }

    const now = Date.now();
    this.cache.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt: now + this.config.ttlMs,
      hits: 0,
    });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      entries: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  private evict(): void {
    // LRU eviction - remove least recently used (lowest hits)
    let lruKey: string | null = null;
    let lruHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < lruHits) {
        lruHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
}

// ============================================================================
// File Cache
// ============================================================================

export class FileCache<T> {
  private config: CacheConfig;
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      type: 'file',
      ttlMs: config?.ttlMs ?? 3600000,
      maxEntries: config?.maxEntries ?? 10000,
      cacheDir: config?.cacheDir ?? '.cache/agent-evals',
      ...config,
    };

    // Ensure cache directory exists
    if (!fs.existsSync(this.config.cacheDir!)) {
      fs.mkdirSync(this.config.cacheDir!, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    return path.join(this.config.cacheDir!, `${key}.json`);
  }

  get(key: string): T | undefined {
    const filePath = this.getFilePath(key);

    if (!fs.existsSync(filePath)) {
      this.stats.misses++;
      return undefined;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        fs.unlinkSync(filePath);
        this.stats.misses++;
        return undefined;
      }

      // Update hits
      entry.hits++;
      fs.writeFileSync(filePath, JSON.stringify(entry));

      this.stats.hits++;
      return entry.value;
    } catch {
      this.stats.misses++;
      return undefined;
    }
  }

  set(key: string, value: T): void {
    const filePath = this.getFilePath(key);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: now + this.config.ttlMs,
      hits: 0,
    };

    fs.writeFileSync(filePath, JSON.stringify(entry));
  }

  has(key: string): boolean {
    const filePath = this.getFilePath(key);

    if (!fs.existsSync(filePath)) return false;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      if (Date.now() > entry.expiresAt) {
        fs.unlinkSync(filePath);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  delete(key: string): boolean {
    const filePath = this.getFilePath(key);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  }

  clear(): void {
    const files = fs.readdirSync(this.config.cacheDir!);
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(this.config.cacheDir!, file));
      }
    }
    this.stats = { hits: 0, misses: 0 };
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const files = fs.existsSync(this.config.cacheDir!)
      ? fs.readdirSync(this.config.cacheDir!).filter((f) => f.endsWith('.json')).length
      : 0;

    return {
      ...this.stats,
      entries: files,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  // Cleanup expired entries
  cleanup(): number {
    let removed = 0;
    const now = Date.now();

    if (!fs.existsSync(this.config.cacheDir!)) return 0;

    const files = fs.readdirSync(this.config.cacheDir!);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(this.config.cacheDir!, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const entry: CacheEntry<T> = JSON.parse(content);

        if (now > entry.expiresAt) {
          fs.unlinkSync(filePath);
          removed++;
        }
      } catch {
        // Remove corrupted files
        fs.unlinkSync(filePath);
        removed++;
      }
    }

    return removed;
  }
}

// ============================================================================
// Unified Cache Interface
// ============================================================================

export type Cache<T> = MemoryCache<T> | FileCache<T>;

export function createCache<T>(config?: Partial<CacheConfig>): Cache<T> {
  const type = config?.type ?? 'memory';

  if (type === 'file') {
    return new FileCache<T>(config);
  }

  return new MemoryCache<T>(config);
}

// ============================================================================
// Result Cache for Evaluations
// ============================================================================

export interface TaskResultCache {
  taskId: string;
  inputHash: string;
  graderResults: Array<{
    graderId: string;
    score: number;
    passed: boolean;
    details?: string;
  }>;
  output: string;
  cachedAt: number;
}

export class EvalResultCache {
  private cache: Cache<TaskResultCache>;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = createCache<TaskResultCache>(config);
  }

  generateKey(taskId: string, input: unknown, graderConfigs: unknown[]): string {
    return hashInput({ taskId, input, graderConfigs });
  }

  get(key: string): TaskResultCache | undefined {
    return this.cache.get(key);
  }

  set(key: string, result: TaskResultCache): void {
    this.cache.set(key, result);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

// Singleton instance
let evalCache: EvalResultCache | null = null;

export function getEvalCache(config?: Partial<CacheConfig>): EvalResultCache {
  if (!evalCache) {
    evalCache = new EvalResultCache(config);
  }
  return evalCache;
}

export function resetEvalCache(): void {
  evalCache = null;
}
