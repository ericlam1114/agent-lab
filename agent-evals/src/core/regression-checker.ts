/**
 * Regression Checker (Task 67)
 * Compares eval metrics against baseline and detects regressions
 */

export interface MetricComparison {
  current: number;
  baseline: number;
  delta: number;
  percentChange: number;
  direction: 'up' | 'down' | 'same';
  isRegression: boolean;
}

export interface RegressionThresholds {
  /** Pass rate drop threshold (default: 5%) */
  passRateDrop: number;
  /** Pass@1 drop threshold (default: 10%) */
  passAt1Drop: number;
  /** Latency increase threshold (default: 20%) */
  latencyIncrease: number;
  /** Token usage increase threshold (default: 30%) */
  tokenIncrease: number;
}

export interface RegressionResult {
  hasRegressions: boolean;
  regressionCount: number;
  improvementCount: number;
  status: 'none' | 'improved' | 'regressed' | 'mixed';
  regressions: RegressionDetail[];
  improvements: RegressionDetail[];
  metrics: {
    passRate: MetricComparison;
    passAtK: Record<number, MetricComparison>;
    latency: {
      avg: MetricComparison;
      p50: MetricComparison;
      p95: MetricComparison;
      p99: MetricComparison;
    };
    tokens: {
      total: MetricComparison;
      prompt: MetricComparison;
      completion: MetricComparison;
    };
  };
}

export interface RegressionDetail {
  metric: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  current: number;
  baseline: number;
  percentChange: number;
}

export interface EvalMetrics {
  passRate: number;
  passAtK: Record<number, number>;
  totalTasks: number;
  totalTrials: number;
  passedTrials: number;
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  tokens: {
    total: number;
    prompt: number;
    completion: number;
  };
}

const DEFAULT_THRESHOLDS: RegressionThresholds = {
  passRateDrop: 0.05, // 5%
  passAt1Drop: 0.10, // 10%
  latencyIncrease: 0.20, // 20%
  tokenIncrease: 0.30, // 30%
};

/**
 * Calculate delta between current and baseline values
 */
function calculateDelta(current: number, baseline: number): Omit<MetricComparison, 'isRegression'> {
  const delta = current - baseline;
  const percentChange = baseline !== 0 ? (delta / baseline) * 100 : current !== 0 ? 100 : 0;
  const direction: 'up' | 'down' | 'same' = delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'same';

  return {
    current,
    baseline,
    delta,
    percentChange,
    direction,
  };
}

/**
 * Check for regressions between current eval metrics and baseline
 */
export function checkRegressions(
  currentMetrics: EvalMetrics,
  baselineMetrics: EvalMetrics,
  thresholds: Partial<RegressionThresholds> = {}
): RegressionResult {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const regressions: RegressionDetail[] = [];
  const improvements: RegressionDetail[] = [];

  // Pass rate comparison
  const passRateDelta = calculateDelta(currentMetrics.passRate, baselineMetrics.passRate);
  const passRateRegression = currentMetrics.passRate < baselineMetrics.passRate - t.passRateDrop;

  if (passRateRegression) {
    regressions.push({
      metric: 'passRate',
      message: `Pass rate dropped from ${(baselineMetrics.passRate * 100).toFixed(1)}% to ${(currentMetrics.passRate * 100).toFixed(1)}%`,
      severity: passRateDelta.percentChange < -10 ? 'critical' : 'warning',
      current: currentMetrics.passRate,
      baseline: baselineMetrics.passRate,
      percentChange: passRateDelta.percentChange,
    });
  } else if (passRateDelta.direction === 'up' && passRateDelta.percentChange > 5) {
    improvements.push({
      metric: 'passRate',
      message: `Pass rate improved from ${(baselineMetrics.passRate * 100).toFixed(1)}% to ${(currentMetrics.passRate * 100).toFixed(1)}%`,
      severity: 'info',
      current: currentMetrics.passRate,
      baseline: baselineMetrics.passRate,
      percentChange: passRateDelta.percentChange,
    });
  }

  // Pass@k comparisons
  const passAtKComparisons: Record<number, MetricComparison> = {};
  const kValues = [1, 3, 5, 10];

  for (const k of kValues) {
    const currentVal = currentMetrics.passAtK[k] || 0;
    const baselineVal = baselineMetrics.passAtK[k] || 0;
    const delta = calculateDelta(currentVal, baselineVal);
    const threshold = k === 1 ? t.passAt1Drop : t.passRateDrop;
    const isRegression = currentVal < baselineVal - threshold;

    passAtKComparisons[k] = { ...delta, isRegression };

    if (isRegression) {
      regressions.push({
        metric: `passAt${k}`,
        message: `Pass@${k} dropped from ${(baselineVal * 100).toFixed(1)}% to ${(currentVal * 100).toFixed(1)}%`,
        severity: k === 1 && delta.percentChange < -15 ? 'critical' : 'warning',
        current: currentVal,
        baseline: baselineVal,
        percentChange: delta.percentChange,
      });
    } else if (delta.direction === 'up' && delta.percentChange > 10) {
      improvements.push({
        metric: `passAt${k}`,
        message: `Pass@${k} improved from ${(baselineVal * 100).toFixed(1)}% to ${(currentVal * 100).toFixed(1)}%`,
        severity: 'info',
        current: currentVal,
        baseline: baselineVal,
        percentChange: delta.percentChange,
      });
    }
  }

  // Latency comparisons
  const latencyComparisons = {
    avg: calculateLatencyComparison(currentMetrics.latency.avg, baselineMetrics.latency.avg, t.latencyIncrease, 'Average latency', regressions, improvements),
    p50: calculateLatencyComparison(currentMetrics.latency.p50, baselineMetrics.latency.p50, t.latencyIncrease, 'P50 latency', regressions, improvements),
    p95: calculateLatencyComparison(currentMetrics.latency.p95, baselineMetrics.latency.p95, t.latencyIncrease, 'P95 latency', regressions, improvements),
    p99: calculateLatencyComparison(currentMetrics.latency.p99, baselineMetrics.latency.p99, t.latencyIncrease * 1.5, 'P99 latency', regressions, improvements),
  };

  // Token comparisons
  const tokenComparisons = {
    total: calculateTokenComparison(currentMetrics.tokens.total, baselineMetrics.tokens.total, t.tokenIncrease, 'Total tokens'),
    prompt: calculateTokenComparison(currentMetrics.tokens.prompt, baselineMetrics.tokens.prompt, t.tokenIncrease, 'Prompt tokens'),
    completion: calculateTokenComparison(currentMetrics.tokens.completion, baselineMetrics.tokens.completion, t.tokenIncrease, 'Completion tokens'),
  };

  // Determine overall status
  const hasRegressions = regressions.length > 0;
  const hasImprovements = improvements.length > 0;
  let status: 'none' | 'improved' | 'regressed' | 'mixed';

  if (hasRegressions && hasImprovements) {
    status = 'mixed';
  } else if (hasRegressions) {
    status = 'regressed';
  } else if (hasImprovements) {
    status = 'improved';
  } else {
    status = 'none';
  }

  return {
    hasRegressions,
    regressionCount: regressions.length,
    improvementCount: improvements.length,
    status,
    regressions,
    improvements,
    metrics: {
      passRate: { ...passRateDelta, isRegression: passRateRegression },
      passAtK: passAtKComparisons,
      latency: latencyComparisons,
      tokens: tokenComparisons,
    },
  };
}

function calculateLatencyComparison(
  current: number,
  baseline: number,
  threshold: number,
  name: string,
  regressions: RegressionDetail[],
  improvements: RegressionDetail[]
): MetricComparison {
  const delta = calculateDelta(current, baseline);
  const isRegression = baseline > 0 && current > baseline * (1 + threshold);

  if (isRegression) {
    regressions.push({
      metric: name.toLowerCase().replace(/ /g, '_'),
      message: `${name} increased from ${baseline.toFixed(0)}ms to ${current.toFixed(0)}ms`,
      severity: delta.percentChange > 50 ? 'critical' : 'warning',
      current,
      baseline,
      percentChange: delta.percentChange,
    });
  } else if (delta.direction === 'down' && Math.abs(delta.percentChange) > 10) {
    improvements.push({
      metric: name.toLowerCase().replace(/ /g, '_'),
      message: `${name} decreased from ${baseline.toFixed(0)}ms to ${current.toFixed(0)}ms`,
      severity: 'info',
      current,
      baseline,
      percentChange: delta.percentChange,
    });
  }

  return { ...delta, isRegression };
}

function calculateTokenComparison(
  current: number,
  baseline: number,
  threshold: number,
  name: string
): MetricComparison {
  const delta = calculateDelta(current, baseline);
  const isRegression = baseline > 0 && current > baseline * (1 + threshold);
  return { ...delta, isRegression };
}

/**
 * Generate a human-readable regression report
 */
export function generateRegressionReport(result: RegressionResult): string {
  const lines: string[] = [];

  lines.push('# Regression Analysis Report');
  lines.push('');
  lines.push(`**Status:** ${result.status.toUpperCase()}`);
  lines.push(`**Regressions:** ${result.regressionCount}`);
  lines.push(`**Improvements:** ${result.improvementCount}`);
  lines.push('');

  if (result.regressions.length > 0) {
    lines.push('## ⚠️ Regressions Detected');
    lines.push('');
    for (const reg of result.regressions) {
      const severity = reg.severity === 'critical' ? '🔴' : reg.severity === 'warning' ? '🟡' : '🔵';
      lines.push(`${severity} **${reg.metric}**: ${reg.message} (${reg.percentChange.toFixed(1)}% change)`);
    }
    lines.push('');
  }

  if (result.improvements.length > 0) {
    lines.push('## ✅ Improvements');
    lines.push('');
    for (const imp of result.improvements) {
      lines.push(`🟢 **${imp.metric}**: ${imp.message} (${imp.percentChange.toFixed(1)}% change)`);
    }
    lines.push('');
  }

  lines.push('## Detailed Metrics');
  lines.push('');
  lines.push(`- Pass Rate: ${(result.metrics.passRate.current * 100).toFixed(1)}% (baseline: ${(result.metrics.passRate.baseline * 100).toFixed(1)}%)`);
  lines.push(`- Pass@1: ${(result.metrics.passAtK[1]?.current * 100 || 0).toFixed(1)}%`);
  lines.push(`- Avg Latency: ${result.metrics.latency.avg.current.toFixed(0)}ms (baseline: ${result.metrics.latency.avg.baseline.toFixed(0)}ms)`);
  lines.push(`- Total Tokens: ${result.metrics.tokens.total.current} (baseline: ${result.metrics.tokens.total.baseline})`);

  return lines.join('\n');
}

/**
 * Check if an eval result represents a regression based on summary
 */
export function isRegression(result: RegressionResult): boolean {
  return result.hasRegressions;
}

/**
 * Get regression severity level
 */
export function getRegressionSeverity(result: RegressionResult): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (!result.hasRegressions) return 'none';

  const criticalCount = result.regressions.filter(r => r.severity === 'critical').length;
  const warningCount = result.regressions.filter(r => r.severity === 'warning').length;

  if (criticalCount >= 2) return 'critical';
  if (criticalCount >= 1) return 'high';
  if (warningCount >= 3) return 'medium';
  if (warningCount >= 1) return 'low';
  return 'none';
}
