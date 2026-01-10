'use client';

/**
 * Dashboard Page (Task 25)
 * Main dashboard with recent evals, stats, and quick actions
 */

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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

        {/* Quick Actions */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700 mb-8">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
            Quick Actions
          </h2>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
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
