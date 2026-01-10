/**
 * Metrics Aggregation (Task 35)
 * Calculate pass@k, pass^k, latency percentiles, and cost estimation
 */

// ============================================================================
// Types
// ============================================================================

export interface TrialMetrics {
  score: number;
  passed: boolean;
  latencyMs: number;
  tokensUsed?: {
    prompt?: number;
    completion?: number;
    total: number;
  };
}

export interface TaskMetrics {
  taskId: string;
  trials: TrialMetrics[];
  passAtK: Record<number, number>;
  passToTheK: Record<number, number>;
  avgScore: number;
  passRate: number;
  latencyPercentiles: LatencyPercentiles;
  tokenUsage: TokenUsage;
  costEstimate: CostEstimate;
}

export interface EvalMetrics {
  evalId: string;
  taskMetrics: TaskMetrics[];
  aggregate: {
    totalTrials: number;
    passedTrials: number;
    avgScore: number;
    passRate: number;
    passAtK: Record<number, number>;
    passToTheK: Record<number, number>;
    latencyPercentiles: LatencyPercentiles;
    totalTokens: number;
    totalCost: number;
  };
}

export interface LatencyPercentiles {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface CostEstimate {
  promptCost: number;
  completionCost: number;
  totalCost: number;
  currency: string;
}

// ============================================================================
// Model Pricing (per 1M tokens)
// ============================================================================

export const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  'gpt-4': { prompt: 30.0, completion: 60.0 },
  'gpt-4-turbo': { prompt: 10.0, completion: 30.0 },
  'gpt-4o': { prompt: 2.5, completion: 10.0 },
  'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
  'gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 },
  'claude-3-opus': { prompt: 15.0, completion: 75.0 },
  'claude-3-sonnet': { prompt: 3.0, completion: 15.0 },
  'claude-3-haiku': { prompt: 0.25, completion: 1.25 },
  'claude-sonnet-4-20250514': { prompt: 3.0, completion: 15.0 },
  'claude-opus-4-5-20251101': { prompt: 15.0, completion: 75.0 },
};

// ============================================================================
// Percentile Calculation
// ============================================================================

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function calculateLatencyPercentiles(latencies: number[]): LatencyPercentiles {
  if (latencies.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
  };
}

// ============================================================================
// Pass@K Calculation
// ============================================================================

/**
 * Calculate pass@k: probability that at least 1 of k samples passes
 * Formula: 1 - C(n-c, k) / C(n, k)
 * Where n = total samples, c = passing samples, k = number of attempts
 */
export function calculatePassAtK(
  trials: TrialMetrics[],
  kValues: number[] = [1, 3, 5, 10]
): Record<number, number> {
  const n = trials.length;
  const c = trials.filter((t) => t.passed).length;

  const result: Record<number, number> = {};

  for (const k of kValues) {
    if (k > n) {
      // Can't sample more than we have
      result[k] = c > 0 ? 1 : 0;
      continue;
    }

    if (c >= n) {
      // All passed
      result[k] = 1;
      continue;
    }

    if (c === 0) {
      // None passed
      result[k] = 0;
      continue;
    }

    // Calculate 1 - C(n-c, k) / C(n, k)
    // Use log-space to avoid overflow
    let logProbFail = 0;
    for (let i = 0; i < k; i++) {
      logProbFail += Math.log(n - c - i) - Math.log(n - i);
    }
    result[k] = 1 - Math.exp(logProbFail);
  }

  return result;
}

/**
 * Calculate pass^k: probability that all k samples pass
 * Formula: C(c, k) / C(n, k)
 * Where n = total samples, c = passing samples, k = number of attempts
 */
export function calculatePassToTheK(
  trials: TrialMetrics[],
  kValues: number[] = [1, 3, 5, 10]
): Record<number, number> {
  const n = trials.length;
  const c = trials.filter((t) => t.passed).length;

  const result: Record<number, number> = {};

  for (const k of kValues) {
    if (k > c) {
      // Not enough passing samples
      result[k] = 0;
      continue;
    }

    if (k > n) {
      result[k] = 0;
      continue;
    }

    // Calculate C(c, k) / C(n, k)
    let logProb = 0;
    for (let i = 0; i < k; i++) {
      logProb += Math.log(c - i) - Math.log(n - i);
    }
    result[k] = Math.exp(logProb);
  }

  return result;
}

// ============================================================================
// Token and Cost Calculation
// ============================================================================

export function calculateTokenUsage(trials: TrialMetrics[]): TokenUsage {
  let prompt = 0;
  let completion = 0;
  let total = 0;

  for (const trial of trials) {
    if (trial.tokensUsed) {
      prompt += trial.tokensUsed.prompt ?? 0;
      completion += trial.tokensUsed.completion ?? 0;
      total += trial.tokensUsed.total;
    }
  }

  return { prompt, completion, total };
}

export function calculateCost(
  tokenUsage: TokenUsage,
  model: string = 'gpt-4o-mini'
): CostEstimate {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];

  const promptCost = (tokenUsage.prompt / 1_000_000) * pricing.prompt;
  const completionCost = (tokenUsage.completion / 1_000_000) * pricing.completion;

  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost,
    currency: 'USD',
  };
}

// ============================================================================
// Task Metrics Calculator
// ============================================================================

export function calculateTaskMetrics(
  taskId: string,
  trials: TrialMetrics[],
  kValues: number[] = [1, 3, 5, 10],
  model?: string
): TaskMetrics {
  const passedTrials = trials.filter((t) => t.passed).length;
  const latencies = trials.map((t) => t.latencyMs);
  const scores = trials.map((t) => t.score);

  const tokenUsage = calculateTokenUsage(trials);
  const costEstimate = calculateCost(tokenUsage, model);

  return {
    taskId,
    trials,
    passAtK: calculatePassAtK(trials, kValues),
    passToTheK: calculatePassToTheK(trials, kValues),
    avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    passRate: trials.length > 0 ? passedTrials / trials.length : 0,
    latencyPercentiles: calculateLatencyPercentiles(latencies),
    tokenUsage,
    costEstimate,
  };
}

// ============================================================================
// Evaluation Metrics Calculator
// ============================================================================

export function calculateEvalMetrics(
  evalId: string,
  taskMetrics: TaskMetrics[],
  kValues: number[] = [1, 3, 5, 10]
): EvalMetrics {
  // Aggregate all trials
  const allTrials = taskMetrics.flatMap((t) => t.trials);
  const passedTrials = allTrials.filter((t) => t.passed).length;
  const scores = allTrials.map((t) => t.score);
  const latencies = allTrials.map((t) => t.latencyMs);

  // Calculate aggregate token usage
  let totalTokens = 0;
  let totalCost = 0;
  for (const tm of taskMetrics) {
    totalTokens += tm.tokenUsage.total;
    totalCost += tm.costEstimate.totalCost;
  }

  return {
    evalId,
    taskMetrics,
    aggregate: {
      totalTrials: allTrials.length,
      passedTrials,
      avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      passRate: allTrials.length > 0 ? passedTrials / allTrials.length : 0,
      passAtK: calculatePassAtK(allTrials, kValues),
      passToTheK: calculatePassToTheK(allTrials, kValues),
      latencyPercentiles: calculateLatencyPercentiles(latencies),
      totalTokens,
      totalCost,
    },
  };
}

// ============================================================================
// Metrics Formatter
// ============================================================================

export function formatMetrics(metrics: EvalMetrics): string {
  const { aggregate } = metrics;

  const lines = [
    '=== Evaluation Metrics ===',
    '',
    `Total Trials: ${aggregate.totalTrials}`,
    `Passed: ${aggregate.passedTrials} (${(aggregate.passRate * 100).toFixed(1)}%)`,
    `Avg Score: ${(aggregate.avgScore * 100).toFixed(1)}%`,
    '',
    '--- Pass@K ---',
    ...Object.entries(aggregate.passAtK).map(
      ([k, v]) => `  pass@${k}: ${(v * 100).toFixed(1)}%`
    ),
    '',
    '--- Pass^K ---',
    ...Object.entries(aggregate.passToTheK).map(
      ([k, v]) => `  pass^${k}: ${(v * 100).toFixed(1)}%`
    ),
    '',
    '--- Latency ---',
    `  p50: ${aggregate.latencyPercentiles.p50.toFixed(0)}ms`,
    `  p95: ${aggregate.latencyPercentiles.p95.toFixed(0)}ms`,
    `  p99: ${aggregate.latencyPercentiles.p99.toFixed(0)}ms`,
    `  avg: ${aggregate.latencyPercentiles.avg.toFixed(0)}ms`,
    '',
    '--- Cost ---',
    `  Total Tokens: ${aggregate.totalTokens.toLocaleString()}`,
    `  Estimated Cost: $${aggregate.totalCost.toFixed(4)}`,
  ];

  return lines.join('\n');
}
