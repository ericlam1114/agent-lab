'use client';

/**
 * Dashboard Page - Palantir Style (Task 41, 46)
 * Main dashboard with recent evals, stats, quick actions, and onboarding
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

// Onboarding component for first-time users
function OnboardingWelcome({ onCreateEval }: { onCreateEval: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-6 ">
        {/* <div className="w-20 h-20 mx-auto mb-6 bg-blue-600 flex items-center justify-center"> */}
          {/* <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg> */}
        {/* </div> */}
        <h1 className="text-3xl font-bold text-black mb-4 mt-12">
          Welcome to Agent Lab
        </h1>
        <p className="text-lg text-zinc-400 mb-8">
          Evaluate your AI agents with comprehensive testing, grading, and analytics.
          Create your first evaluation to get started.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/evals/new"
            className="btn btn-primary px-8 py-3 text-base flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Eval
          </Link>
          <Link
            href="/docs"
            className="btn btn-secondary px-8 py-3 text-base flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Read Documentation
          </Link>
        </div>

        {/* Quick Start Steps */}
        <div className="card p-6  items-center justify-center flex flex-col text-center ">
          <h2 className="text-lg font-semibold text-black mb-4 ">Quick Start Guide</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-blue-600 flex-shrink-0 flex items-center justify-center text-sm font-bold text-white">
                1
              </div>
              <p className="text-sm text-zinc-400">Set up your AI agent&apos;s HTTP endpoint and authentication</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-blue-600 flex-shrink-0 flex items-center justify-center text-sm font-bold text-white">
                2
              </div>
              <p className="text-sm text-zinc-400">Create prompts and expected outcomes for evaluation</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-blue-600 flex-shrink-0 flex items-center justify-center text-sm font-bold text-white">
                3
              </div>
              <p className="text-sm text-zinc-400">Execute evaluations and review detailed results</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  value,
  label,
  color = 'default'
}: {
  value: string | number;
  label: string;
  color?: 'default' | 'pass' | 'fail' | 'running' | 'warning';
}) {
  const colorClasses = {
    default: 'text-white',
    pass: 'text-emerald-500',
    fail: 'text-red-500',
    running: 'text-blue-500',
    warning: 'text-amber-500',
  };

  return (
    <div className="card p-6">
      <div className={`text-3xl font-bold data-value ${colorClasses[color]}`}>
        {value}
      </div>
      <div className="text-sm text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const statusClasses: Record<string, string> = {
    completed: 'badge-pass',
    running: 'badge-running',
    failed: 'badge-fail',
    pending: 'badge-warning',
  };

  return (
    <span className={`badge ${statusClasses[status] || 'badge-info'}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [evals, setEvals] = useState<EvalSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const chartData = evals
    .slice()
    .reverse()
    .map((e) => ({
      name: e.name.substring(0, 15),
      passRate: e.totalTrials > 0 ? (e.passedTrials / e.totalTrials) * 100 : 0,
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={fetchData} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show onboarding if no evals exist
  if (evals.length === 0) {
    return <OnboardingWelcome onCreateEval={() => {}} />;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-zinc-500 mt-1">Overview of your agent evaluations</p>
          </div>
          <Link href="/evals/new" className="btn btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Eval
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard value={stats?.total || 0} label="Total Evaluations" />
          <StatCard value={stats?.completed || 0} label="Completed" color="pass" />
          <StatCard value={stats?.running || 0} label="Running" color="running" />
          <StatCard
            value={stats ? `${(stats.avgPassRate * 100).toFixed(0)}%` : '0%'}
            label="Avg Pass Rate"
          />
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              Recent Pass Rates
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d333b" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#8b949e', fontSize: 12 }}
                    axisLine={{ stroke: '#2d333b' }}
                  />
                  <YAxis
                    tick={{ fill: '#8b949e', fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={{ stroke: '#2d333b' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1f2e',
                      border: '1px solid #2d333b',
                      borderRadius: '0',
                    }}
                    labelStyle={{ color: '#e8eaed' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Pass Rate']}
                  />
                  <Bar dataKey="passRate" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Evals Table */}
        <div className="card">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Recent Evaluations
              </h2>
              <Link href="/evals" className="text-sm text-blue-500 hover:text-blue-400">
                View all
              </Link>
            </div>
          </div>
          <table className="table-tactical">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Tasks</th>
                <th>Pass Rate</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {evals.map((evalItem) => (
                <tr key={evalItem.id}>
                  <td>
                    <Link
                      href={`/evals/${evalItem.id}`}
                      className="text-white hover:text-blue-400 font-medium"
                    >
                      {evalItem.name}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={evalItem.status} />
                  </td>
                  <td className="data-value text-zinc-400">
                    {evalItem.completedTasks}/{evalItem.totalTasks}
                  </td>
                  <td>
                    <span className={`data-value font-semibold ${
                      evalItem.totalTrials > 0 && (evalItem.passedTrials / evalItem.totalTrials) >= 0.8
                        ? 'text-emerald-500'
                        : evalItem.totalTrials > 0 && (evalItem.passedTrials / evalItem.totalTrials) >= 0.5
                        ? 'text-amber-500'
                        : 'text-red-500'
                    }`}>
                      {evalItem.totalTrials > 0
                        ? ((evalItem.passedTrials / evalItem.totalTrials) * 100).toFixed(0)
                        : 0}%
                    </span>
                  </td>
                  <td className="text-zinc-500 text-sm">
                    {new Date(evalItem.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
