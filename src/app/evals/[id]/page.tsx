'use client';

/**
 * Eval Detail Page (Task 27, 67)
 * Detailed view of a specific evaluation with regression alerts
 */

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { ResultsTable } from '../../components/ResultsTable';
import { TranscriptViewer } from '../../components/TranscriptViewer';

interface GraderResult {
  id: string;
  graderId: string;
  graderType: string;
  score: number;
  passed: boolean;
  details?: string;
}

interface Trial {
  id: string;
  attempt: number;
  status: string;
  score: number;
  passed: boolean;
  transcript?: string;
  latencyMs?: number;
  graderResults: GraderResult[];
}

interface Task {
  id: string;
  description: string;
  type: string;
  input: string;
  avgScore: number;
  passRate: number;
  trials: Trial[];
}

interface EvalData {
  id: string;
  name: string;
  description?: string;
  config: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  passedTrials: number;
  totalTrials: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface Metrics {
  totalTasks: number;
  totalTrials: number;
  passedTrials: number;
  passRate: number;
  avgLatencyMs: number;
}

interface Baseline {
  id: string;
  name: string;
  evalId: string;
  isDefault: boolean;
  createdAt: string;
  metrics: {
    passRate: number;
    passAtK: Record<number, number>;
    latency: { avg: number; p50: number; p95: number; p99: number };
    tokens: { total: number; prompt: number; completion: number };
  };
}

interface RegressionDetail {
  metric: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  current: number;
  baseline: number;
  percentChange: number;
}

interface RegressionComparison {
  hasRegressions: boolean;
  regressionCount: number;
  improvementCount: number;
  summary: {
    regressions: string[];
    improvements: string[];
  };
  passRate: {
    current: number;
    baseline: number;
    delta: number;
    percentChange: number;
    isRegression: boolean;
  };
}

export default function EvalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [evalData, setEvalData] = useState<EvalData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null);

  // Regression tracking state
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [selectedBaseline, setSelectedBaseline] = useState<string>('');
  const [comparison, setComparison] = useState<RegressionComparison | null>(null);
  const [comparingRegression, setComparingRegression] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [newBaselineName, setNewBaselineName] = useState('');

  const fetchEvalData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/evals/${id}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Evaluation not found');
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      setEvalData(data.eval);
      setTasks(data.tasks);
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchBaselines = useCallback(async () => {
    try {
      const response = await fetch('/api/baselines');
      if (response.ok) {
        const data = await response.json();
        setBaselines(data.baselines || []);
        // Auto-select default baseline if available
        const defaultBaseline = data.baselines?.find((b: Baseline) => b.isDefault);
        if (defaultBaseline) {
          setSelectedBaseline(defaultBaseline.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch baselines:', err);
    }
  }, []);

  useEffect(() => {
    fetchEvalData();
    fetchBaselines();
  }, [fetchEvalData, fetchBaselines]);

  // Compare against baseline when selection changes
  useEffect(() => {
    if (selectedBaseline && evalData) {
      compareToBaseline();
    } else {
      setComparison(null);
    }
  }, [selectedBaseline, evalData]);

  const compareToBaseline = async () => {
    if (!selectedBaseline) return;

    setComparingRegression(true);
    try {
      const response = await fetch('/api/baselines/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evalId: id, baselineId: selectedBaseline }),
      });

      if (response.ok) {
        const data = await response.json();
        setComparison(data);
      }
    } catch (err) {
      console.error('Failed to compare:', err);
    } finally {
      setComparingRegression(false);
    }
  };

  const createBaseline = async () => {
    try {
      const response = await fetch('/api/baselines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evalId: id,
          name: newBaselineName || `Baseline from ${evalData?.name}`,
          isDefault: baselines.length === 0,
        }),
      });

      if (response.ok) {
        setShowBaselineModal(false);
        setNewBaselineName('');
        fetchBaselines();
      }
    } catch (err) {
      console.error('Failed to create baseline:', err);
    }
  };

  const handleExport = (format: 'json' | 'csv' | 'markdown') => {
    if (!evalData || !tasks) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify({ eval: evalData, tasks, metrics, comparison }, null, 2);
      filename = `${evalData.name}-${id}.json`;
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const headers = ['Task', 'Description', 'Score', 'Pass Rate', 'Trials'];
      const rows = tasks.map((t) => [
        t.id,
        `"${t.description}"`,
        (t.avgScore * 100).toFixed(1),
        (t.passRate * 100).toFixed(1),
        t.trials.length,
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      filename = `${evalData.name}-${id}.csv`;
      mimeType = 'text/csv';
    } else {
      content = `# Evaluation: ${evalData.name}

## Summary
- **Status:** ${evalData.status}
- **Pass Rate:** ${metrics ? (metrics.passRate * 100).toFixed(1) : 0}%
- **Total Tasks:** ${metrics?.totalTasks || 0}
- **Avg Latency:** ${metrics ? metrics.avgLatencyMs.toFixed(0) : 0}ms
- **Created:** ${evalData.createdAt}
${comparison ? `
## Regression Analysis
- **Has Regressions:** ${comparison.hasRegressions ? 'Yes' : 'No'}
- **Regressions:** ${comparison.regressionCount}
- **Improvements:** ${comparison.improvementCount}
${comparison.summary.regressions.map(r => `- ⚠️ ${r}`).join('\n')}
${comparison.summary.improvements.map(i => `- ✅ ${i}`).join('\n')}
` : ''}
## Task Results

| Task | Description | Score | Pass Rate |
|------|-------------|-------|-----------|
${tasks.map((t) => `| ${t.id} | ${t.description} | ${(t.avgScore * 100).toFixed(1)}% | ${(t.passRate * 100).toFixed(1)}% |`).join('\n')}
`;
      filename = `${evalData.name}-${id}.md`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTrialClick = (taskId: string, trialId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const trial = task?.trials.find((tr) => tr.id === trialId);
    setSelectedTrial(trial || null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (error || !evalData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error || 'Evaluation not found'}</div>
          <Link href="/evals" className="text-blue-600 hover:underline">
            Back to evaluations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/evals" className="text-zinc-500 hover:text-zinc-700">
              ← Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">{evalData.name}</h1>
              {evalData.description && (
                <p className="text-sm text-[var(--foreground-muted)]">{evalData.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${evalData.status === 'completed' ? 'badge-pass' : evalData.status === 'running' ? 'badge-running' : 'badge-fail'}`}>
              {evalData.status}
            </span>
            <button
              onClick={() => setShowBaselineModal(true)}
              className="btn btn-secondary"
            >
              Set as Baseline
            </button>
          </div>
        </div>

        {/* Regression Alert Banner */}
        {comparison && comparison.hasRegressions && (
          <div className="card p-4 mb-6 border-l-4 border-red-500 bg-red-50">
            <div className="flex items-start gap-3">
              <div className="text-red-500 text-xl">⚠️</div>
              <div>
                <h3 className="font-semibold text-red-800">Regression Detected</h3>
                <p className="text-sm text-red-700 mt-1">
                  {comparison.regressionCount} regression{comparison.regressionCount !== 1 ? 's' : ''} found compared to baseline.
                </p>
                <ul className="mt-2 space-y-1">
                  {comparison.summary.regressions.map((reg, i) => (
                    <li key={i} className="text-sm text-red-700">• {reg}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Improvement Banner */}
        {comparison && !comparison.hasRegressions && comparison.improvementCount > 0 && (
          <div className="card p-4 mb-6 border-l-4 border-green-500 bg-green-50">
            <div className="flex items-start gap-3">
              <div className="text-green-500 text-xl">✅</div>
              <div>
                <h3 className="font-semibold text-green-800">Improvements Detected</h3>
                <p className="text-sm text-green-700 mt-1">
                  {comparison.improvementCount} improvement{comparison.improvementCount !== 1 ? 's' : ''} compared to baseline.
                </p>
                <ul className="mt-2 space-y-1">
                  {comparison.summary.improvements.map((imp, i) => (
                    <li key={i} className="text-sm text-green-700">• {imp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Baseline Selector */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-[var(--foreground)]">Compare to Baseline:</label>
              <select
                value={selectedBaseline}
                onChange={(e) => setSelectedBaseline(e.target.value)}
                className="input w-64"
              >
                <option value="">No comparison</option>
                {baselines.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
              {comparingRegression && (
                <span className="text-sm text-zinc-500">Comparing...</span>
              )}
            </div>
            {comparison && (
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-1 rounded ${comparison.hasRegressions ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {comparison.hasRegressions ? '⚠️ Regressed' : '✓ No Regressions'}
                </span>
                {comparison.passRate && (
                  <span className={`px-2 py-1 rounded ${comparison.passRate.delta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    Pass Rate: {comparison.passRate.delta >= 0 ? '+' : ''}{(comparison.passRate.percentChange).toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-6">
            <div className="text-3xl font-bold data-value text-[var(--foreground)]">
              {metrics ? (metrics.passRate * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">Pass Rate</div>
            {comparison && comparison.passRate && (
              <div className={`text-xs mt-1 ${comparison.passRate.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.passRate.delta >= 0 ? '↑' : '↓'} {Math.abs(comparison.passRate.percentChange).toFixed(1)}% vs baseline
              </div>
            )}
          </div>
          <div className="card p-6">
            <div className="text-3xl font-bold data-value text-[var(--foreground)]">
              {metrics?.totalTasks || 0}
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">Tasks</div>
          </div>
          <div className="card p-6">
            <div className="text-3xl font-bold data-value text-[var(--foreground)]">
              {metrics?.totalTrials || 0}
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">Trials</div>
          </div>
          <div className="card p-6">
            <div className="text-3xl font-bold data-value text-[var(--foreground)]">
              {metrics ? metrics.avgLatencyMs.toFixed(0) : 0}ms
            </div>
            <div className="text-sm text-[var(--foreground-muted)]">Avg Latency</div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => handleExport('json')} className="btn btn-secondary">
            Export JSON
          </button>
          <button onClick={() => handleExport('csv')} className="btn btn-secondary">
            Export CSV
          </button>
          <button onClick={() => handleExport('markdown')} className="btn btn-secondary">
            Export Markdown
          </button>
          <button
            onClick={() => {
              const url = `${window.location.origin}/evals/${id}`;
              navigator.clipboard.writeText(url);
            }}
            className="btn btn-secondary"
          >
            Copy Link
          </button>
        </div>

        {/* Results Table */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Task Results
          </h2>
          <ResultsTable tasks={tasks} onTrialClick={handleTrialClick} />
        </div>

        {/* Transcript Viewer Modal */}
        {selectedTrial && (
          <div className="modal-overlay" onClick={() => setSelectedTrial(null)}>
            <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold">Trial Transcript</h3>
                <button onClick={() => setSelectedTrial(null)} className="text-zinc-500 hover:text-zinc-700">
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {selectedTrial.transcript ? (
                  <TranscriptViewer
                    messages={JSON.parse(selectedTrial.transcript).messages || []}
                    toolCalls={JSON.parse(selectedTrial.transcript).toolCalls || []}
                  />
                ) : (
                  <div className="text-zinc-500">No transcript available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Baseline Modal */}
        {showBaselineModal && (
          <div className="modal-overlay" onClick={() => setShowBaselineModal(false)}>
            <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold">Create Baseline</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-[var(--foreground-muted)] mb-4">
                  Save this evaluation&apos;s metrics as a baseline for future regression tracking.
                </p>
                <label className="block text-sm font-medium mb-2">Baseline Name</label>
                <input
                  type="text"
                  value={newBaselineName}
                  onChange={(e) => setNewBaselineName(e.target.value)}
                  placeholder={`Baseline from ${evalData.name}`}
                  className="input w-full mb-4"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowBaselineModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button onClick={createBaseline} className="btn btn-primary">
                    Create Baseline
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
