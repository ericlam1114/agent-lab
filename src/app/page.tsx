'use client';

/**
 * Dashboard Page (Task 25)
 * Main dashboard with recent evals, stats, and quick actions
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// ============================================================================
// Run Eval Modal Component
// ============================================================================

interface RunEvalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (configPath: string) => void;
  isRunning: boolean;
}

function RunEvalModal({ isOpen, onClose, onRun, isRunning }: RunEvalModalProps) {
  const [configPath, setConfigPath] = useState('agenteval.yaml');
  const [activeTab, setActiveTab] = useState<'file' | 'cli'>('file');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Run New Evaluation
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'file'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Run from Config
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'cli'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            CLI Instructions
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'file' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Config File Path
                </label>
                <input
                  type="text"
                  value={configPath}
                  onChange={(e) => setConfigPath(e.target.value)}
                  placeholder="agenteval.yaml"
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Path to your evaluation config file (YAML or JSON)
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-md p-4">
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Example Config Structure
                </h4>
                <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto">
{`name: my-agent-eval
agent:
  type: http
  endpoint: http://localhost:8000/chat
tasks:
  - description: Test greeting
    input:
      prompt: "Hello, how are you?"
    graders:
      - type: contains
        value: "hello"`}
                </pre>
              </div>

              <button
                onClick={() => onRun(configPath)}
                disabled={isRunning || !configPath}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Running...
                  </>
                ) : (
                  'Run Evaluation'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You can also run evaluations from the command line:
              </p>

              <div className="space-y-3">
                <div className="bg-zinc-900 rounded-md p-4">
                  <p className="text-xs text-zinc-400 mb-1"># Initialize a new eval config</p>
                  <code className="text-sm text-green-400">npx agenteval init</code>
                </div>

                <div className="bg-zinc-900 rounded-md p-4">
                  <p className="text-xs text-zinc-400 mb-1"># Run evaluation</p>
                  <code className="text-sm text-green-400">npx agenteval run --config agenteval.yaml</code>
                </div>

                <div className="bg-zinc-900 rounded-md p-4">
                  <p className="text-xs text-zinc-400 mb-1"># View results in browser</p>
                  <code className="text-sm text-green-400">npx agenteval view</code>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Tip:</strong> The CLI provides more options like verbose output,
                  parallel execution, and custom output formats.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface EvalSummary {
  id: string;
  name: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  passedTrials: number;
  totalTrials: number;
  createdAt: string;
}

interface Stats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  avgPassRate: number;
}

export default function Dashboard() {
  const [evals, setEvals] = useState<EvalSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/evals?limit=10');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setEvals(data.evals);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunEval = async (configPath: string) => {
    setIsRunning(true);
    setRunMessage(null);

    try {
      const response = await fetch('/api/evals/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configPath }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start evaluation');
      }

      const data = await response.json();
      setRunMessage({ type: 'success', text: `Evaluation "${data.name}" started successfully!` });
      setShowRunModal(false);

      // Refresh the eval list
      setTimeout(() => {
        fetchData();
        setRunMessage(null);
      }, 2000);
    } catch (err) {
      setRunMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to run evaluation'
      });
    } finally {
      setIsRunning(false);
    }
  };

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

  const chartData = evals
    .slice()
    .reverse()
    .map((e) => ({
      name: e.name.substring(0, 15),
      passRate: e.totalTrials > 0 ? (e.passedTrials / e.totalTrials) * 100 : 0,
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
              Agent Evals
            </h1>
            <nav className="flex gap-4">
              <Link
                href="/evals"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                All Evals
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
              {stats?.total || 0}
            </div>
            <div className="text-sm text-zinc-500">Total Evaluations</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="text-3xl font-bold text-green-600">{stats?.completed || 0}</div>
            <div className="text-sm text-zinc-500">Completed</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="text-3xl font-bold text-blue-600">{stats?.running || 0}</div>
            <div className="text-sm text-zinc-500">Running</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
            <div className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
              {stats ? (stats.avgPassRate * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-zinc-500">Avg Pass Rate</div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700 mb-8">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
              Recent Pass Rates
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#F9FAFB' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Pass Rate']}
                  />
                  <Bar dataKey="passRate" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Status Message */}
        {runMessage && (
          <div className={`mb-4 p-4 rounded-lg ${
            runMessage.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {runMessage.text}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700 mb-8">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
            Quick Actions
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => setShowRunModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Run New Eval
            </button>
            {evals[0] && (
              <Link
                href={`/evals/${evals[0].id}`}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm"
              >
                View Latest
              </Link>
            )}
          </div>
        </div>

        {/* Run Eval Modal */}
        <RunEvalModal
          isOpen={showRunModal}
          onClose={() => setShowRunModal(false)}
          onRun={handleRunEval}
          isRunning={isRunning}
        />

        {/* Recent Evals */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              Recent Evaluations
            </h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {evals.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500">
                No evaluations yet. Run your first eval with{' '}
                <code className="bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 rounded">
                  agenteval run
                </code>
              </div>
            ) : (
              evals.map((evalItem) => (
                <Link
                  key={evalItem.id}
                  href={`/evals/${evalItem.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                >
                  <div>
                    <div className="font-medium text-zinc-800 dark:text-zinc-100">
                      {evalItem.name}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {new Date(evalItem.createdAt).toLocaleString()} • {evalItem.totalTasks}{' '}
                      tasks
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {evalItem.totalTrials > 0
                          ? ((evalItem.passedTrials / evalItem.totalTrials) * 100).toFixed(0)
                          : 0}
                        %
                      </div>
                      <div className="text-xs text-zinc-500">pass rate</div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(evalItem.status)}`}
                    >
                      {evalItem.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
          {evals.length > 0 && (
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-700">
              <Link
                href="/evals"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all evaluations →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
