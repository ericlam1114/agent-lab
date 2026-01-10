'use client';

/**
 * Eval Detail Page (Task 27)
 * Detailed view of a specific evaluation
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

export default function EvalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [evalData, setEvalData] = useState<EvalData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null);

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

  useEffect(() => {
    fetchEvalData();
  }, [fetchEvalData]);

  const handleExport = (format: 'json' | 'csv' | 'markdown') => {
    if (!evalData || !tasks) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify({ eval: evalData, tasks, metrics }, null, 2);
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (error || !evalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error || 'Evaluation not found'}</div>
          <Link href="/evals" className="text-blue-600 hover:underline">
            Back to evaluations
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'running':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default:
        return 'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/evals"
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                ← Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                  {evalData.name}
                </h1>
                {evalData.description && (
                  <p className="text-sm text-zinc-500">{evalData.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(evalData.status)}`}
              >
                {evalData.status}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
              {metrics ? (metrics.passRate * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-zinc-500">Pass Rate</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
              {metrics?.totalTasks || 0}
            </div>
            <div className="text-sm text-zinc-500">Tasks</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
              {metrics?.totalTrials || 0}
            </div>
            <div className="text-sm text-zinc-500">Trials</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
              {metrics ? metrics.avgLatencyMs.toFixed(0) : 0}ms
            </div>
            <div className="text-sm text-zinc-500">Avg Latency</div>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('markdown')}
            className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            Export Markdown
          </button>
          <button
            onClick={() => {
              const url = `${window.location.origin}/evals/${id}`;
              navigator.clipboard.writeText(url);
            }}
            className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            Copy Link
          </button>
        </div>

        {/* Results Table */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
            Task Results
          </h2>
          <ResultsTable tasks={tasks} onTrialClick={handleTrialClick} />
        </div>

        {/* Transcript Viewer Modal */}
        {selectedTrial && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold">Trial Transcript</h3>
                <button
                  onClick={() => setSelectedTrial(null)}
                  className="text-zinc-500 hover:text-zinc-700"
                >
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
      </main>
    </div>
  );
}
