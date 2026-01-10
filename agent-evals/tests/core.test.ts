/**
 * Unit Tests for Core Modules (Task 37)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseConfig } from '../src/config/schema';
import { MemoryCache, hashInput } from '../src/core/cache';
import {
  calculatePassAtK,
  calculatePassToTheK,
  calculateLatencyPercentiles,
  calculateTaskMetrics,
  type TrialMetrics,
} from '../src/core/metrics';
import {
  CircuitBreaker,
  CircuitBreakerOpen,
  withRetry,
  AgentEvalError,
  NetworkError,
} from '../src/core/errors';

// ============================================================================
// Config Parser Tests
// ============================================================================

describe('Config Parser', () => {
  it('should parse valid YAML config', () => {
    const yaml = `
name: test-eval
description: Test evaluation

agent:
  type: http
  endpoint: http://localhost:3000/api/agent
  timeout: 30000

tasks:
  - id: task-1
    description: Test task
    input:
      prompt: "Hello world"
    graders:
      - type: exact-match
        value: "Hello"
`;

    const config = parseConfig(yaml);
    expect(config.name).toBe('test-eval');
    expect(config.agent.endpoint).toBe('http://localhost:3000/api/agent');
    expect(config.tasks).toHaveLength(1);
    expect(config.tasks[0].id).toBe('task-1');
  });

  it('should throw on invalid YAML', () => {
    const yaml = 'not: [valid: yaml:';
    expect(() => parseConfig(yaml)).toThrow();
  });

  it('should throw on missing required fields', () => {
    const yaml = `
name: test
agent:
  type: http
  endpoint: http://localhost:3000
tasks: []
`;
    expect(() => parseConfig(yaml)).toThrow();
  });

  it('should apply default settings', () => {
    const yaml = `
name: test-eval

agent:
  type: http
  endpoint: http://localhost:3000/api/agent

tasks:
  - id: task-1
    description: Test task
    input:
      prompt: "Hello"
    graders:
      - type: json-valid
`;

    const config = parseConfig(yaml);
    expect(config.settings).toBeDefined();
    expect(config.settings.trialsPerTask).toBe(1);
    expect(config.settings.maxConcurrency).toBe(5);
  });
});

// ============================================================================
// Cache Tests
// ============================================================================

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache({ ttlMs: 1000, maxEntries: 10 });
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should delete keys', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  it('should track stats', () => {
    cache.set('key1', 'value1');
    cache.get('key1'); // hit
    cache.get('key2'); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.entries).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  it('should evict entries when at capacity', () => {
    const smallCache = new MemoryCache<number>({ maxEntries: 3 });

    smallCache.set('a', 1);
    smallCache.set('b', 2);
    smallCache.set('c', 3);
    smallCache.get('a'); // increase hits
    smallCache.get('a');
    smallCache.set('d', 4); // should evict 'b' or 'c' (lowest hits)

    expect(smallCache.getStats().entries).toBe(3);
    expect(smallCache.get('a')).toBe(1); // most hits, should still exist
  });
});

describe('hashInput', () => {
  it('should produce consistent hashes', () => {
    const input = { a: 1, b: 'hello' };
    const hash1 = hashInput(input);
    const hash2 = hashInput(input);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashInput({ a: 1 });
    const hash2 = hashInput({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });

  it('should be order-independent for object keys', () => {
    const hash1 = hashInput({ a: 1, b: 2 });
    const hash2 = hashInput({ b: 2, a: 1 });
    expect(hash1).toBe(hash2);
  });
});

// ============================================================================
// Metrics Tests
// ============================================================================

describe('Pass@K Calculation', () => {
  it('should return 1 when all trials pass', () => {
    const trials: TrialMetrics[] = [
      { score: 1, passed: true, latencyMs: 100 },
      { score: 1, passed: true, latencyMs: 100 },
      { score: 1, passed: true, latencyMs: 100 },
    ];

    const result = calculatePassAtK(trials, [1, 2, 3]);
    expect(result[1]).toBe(1);
    expect(result[2]).toBe(1);
    expect(result[3]).toBe(1);
  });

  it('should return 0 when no trials pass', () => {
    const trials: TrialMetrics[] = [
      { score: 0, passed: false, latencyMs: 100 },
      { score: 0, passed: false, latencyMs: 100 },
      { score: 0, passed: false, latencyMs: 100 },
    ];

    const result = calculatePassAtK(trials, [1, 2, 3]);
    expect(result[1]).toBe(0);
    expect(result[2]).toBe(0);
    expect(result[3]).toBe(0);
  });

  it('should calculate correct probability for mixed results', () => {
    const trials: TrialMetrics[] = [
      { score: 1, passed: true, latencyMs: 100 },
      { score: 0, passed: false, latencyMs: 100 },
      { score: 0, passed: false, latencyMs: 100 },
    ];

    const result = calculatePassAtK(trials, [1, 2, 3]);
    expect(result[1]).toBeCloseTo(1 / 3, 2);
    expect(result[2]).toBeCloseTo(2 / 3, 2);
    expect(result[3]).toBe(1);
  });
});

describe('Pass^K Calculation', () => {
  it('should return 1 when all trials pass and k<=n', () => {
    const trials: TrialMetrics[] = [
      { score: 1, passed: true, latencyMs: 100 },
      { score: 1, passed: true, latencyMs: 100 },
    ];

    const result = calculatePassToTheK(trials, [1, 2]);
    expect(result[1]).toBe(1);
    expect(result[2]).toBe(1);
  });

  it('should return 0 when k > passing count', () => {
    const trials: TrialMetrics[] = [
      { score: 1, passed: true, latencyMs: 100 },
      { score: 0, passed: false, latencyMs: 100 },
    ];

    const result = calculatePassToTheK(trials, [1, 2]);
    expect(result[1]).toBe(0.5);
    expect(result[2]).toBe(0);
  });
});

describe('Latency Percentiles', () => {
  it('should calculate correct percentiles', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = calculateLatencyPercentiles(latencies);

    expect(result.min).toBe(10);
    expect(result.max).toBe(100);
    expect(result.p50).toBeCloseTo(55, 0);
    expect(result.avg).toBe(55);
  });

  it('should handle empty array', () => {
    const result = calculateLatencyPercentiles([]);
    expect(result.p50).toBe(0);
    expect(result.avg).toBe(0);
  });

  it('should handle single value', () => {
    const result = calculateLatencyPercentiles([50]);
    expect(result.min).toBe(50);
    expect(result.max).toBe(50);
    expect(result.p50).toBe(50);
    expect(result.avg).toBe(50);
  });
});

describe('Task Metrics', () => {
  it('should calculate comprehensive metrics', () => {
    const trials: TrialMetrics[] = [
      { score: 1, passed: true, latencyMs: 100, tokensUsed: { prompt: 50, completion: 100, total: 150 } },
      { score: 0.5, passed: true, latencyMs: 200, tokensUsed: { prompt: 60, completion: 90, total: 150 } },
      { score: 0, passed: false, latencyMs: 150, tokensUsed: { prompt: 40, completion: 80, total: 120 } },
    ];

    const metrics = calculateTaskMetrics('task-1', trials, [1, 2, 3]);

    expect(metrics.taskId).toBe('task-1');
    expect(metrics.avgScore).toBeCloseTo(0.5, 2);
    expect(metrics.passRate).toBeCloseTo(2 / 3, 2);
    expect(metrics.tokenUsage.total).toBe(420);
    expect(metrics.costEstimate.totalCost).toBeGreaterThan(0);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('CircuitBreaker', () => {
  it('should allow calls when closed', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
    expect(breaker.getState()).toBe('closed');
  });

  it('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeMs: 10000 });

    const failingFn = async () => {
      throw new Error('fail');
    };

    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(failingFn);
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe('open');

    // Next call should throw CircuitBreakerOpen
    await expect(breaker.execute(async () => 'test')).rejects.toThrow(CircuitBreakerOpen);
  });

  it('should reset after success', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    // Fail twice
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }
    }

    // Succeed
    await breaker.execute(async () => 'success');

    // State should be closed again
    expect(breaker.getState()).toBe('closed');
  });
});

describe('withRetry', () => {
  it('should return on first success', async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  it('should retry on retryable errors', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new NetworkError('Connection failed');
        }
        return 'success';
      },
      { maxRetries: 3, initialDelayMs: 10 }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should not retry on non-retryable errors', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new AgentEvalError('Config error', 'CONFIG_ERROR');
        },
        { maxRetries: 3, initialDelayMs: 10 }
      )
    ).rejects.toThrow();

    expect(attempts).toBe(1);
  });
});
