'use client';

/**
 * Trends Dashboard Page (Task 68)
 * Visualize eval metrics over time with charts and filtering
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

interface TrendDataPoint {
  date: string;
  evalId: string;
  evalName: string;
  passRate: number;
  passAt1: number;
  passAt3: number;
  passAt5: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  totalTokens: number;
  estimatedCost: number;
  taskCount: number;
  trialCount: number;
}

interface TrendStats {
  totalEvals: number;
  avgPassRate: number;
  avgLatency: number;
  totalCost: number;
  passRateTrend: { direction: 'up' | 'down' | 'stable'; percentChange: number };
  latencyTrend: { direction: 'up' | 'down' | 'stable'; percentChange: number };
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [stats, setStats] = useState<TrendStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(50);

  // Active chart
  const [activeChart, setActiveChart] = useState<'passRate' | 'passAtK' | 'latency' | 'cost'>('passRate');

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', limit.toString());

      const response = await fetch(`/api/trends?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trends');

      const data = await response.json();
      setTrends(data.trends || []);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, limit]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const handleExport = (format: 'json' | 'csv') => {
    if (!trends.length) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify({ trends, stats }, null, 2);
      filename = 'eval-trends.json';
      mimeType = 'application/json';
    } else {
      const headers = ['Date', 'Eval Name', 'Pass Rate', 'Pass@1', 'Pass@3', 'Avg Latency', 'Total Tokens', 'Est. Cost'];
      const rows = trends.map(t => [
        t.date,
        `"${t.evalName}"`,
        (t.passRate * 100).toFixed(1),
        (t.passAt1 * 100).toFixed(1),
        (t.passAt3 * 100).toFixed(1),
        t.avgLatency.toFixed(0),
        t.totalTokens,
        t.estimatedCost.toFixed(4),
      ]);
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      filename = 'eval-trends.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format data for charts
  const chartData = trends.map(t => ({
    ...t,
    date: new Date(t.date).toLocaleDateString(),
    passRatePercent: t.passRate * 100,
    passAt1Percent: t.passAt1 * 100,
    passAt3Percent: t.passAt3 * 100,
    passAt5Percent: t.passAt5 * 100,
  }));

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'stable', isGoodWhenUp: boolean) => {
    if (direction === 'stable') return 'text-zinc-500';
    if (direction === 'up') return isGoodWhenUp ? 'text-green-600' : 'text-red-600';
    return isGoodWhenUp ? 'text-red-600' : 'text-green-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Loading trends...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button onClick={fetchTrends} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Trends Dashboard</h1>
            <p className="text-[var(--foreground-muted)] mt-1">
              Track evaluation metrics over time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handleExport('json')} className="btn btn-secondary">
              Export JSON
            </button>
            <button onClick={() => handleExport('csv')} className="btn btn-secondary">
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">
                Max Results
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="input w-24"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="flex-1" />
            <button onClick={fetchTrends} className="btn btn-primary mt-5">
              Apply Filters
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-6">
              <div className="text-3xl font-bold data-value text-[var(--foreground)]">
                {stats.totalEvals}
              </div>
              <div className="text-sm text-[var(--foreground-muted)]">Total Evals</div>
            </div>
            <div className="card p-6">
              <div className="text-3xl font-bold data-value text-[var(--foreground)]">
                {(stats.avgPassRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-[var(--foreground-muted)]">Avg Pass Rate</div>
              <div className={`text-xs mt-1 ${getTrendColor(stats.passRateTrend.direction, true)}`}>
                {getTrendIcon(stats.passRateTrend.direction)} {Math.abs(stats.passRateTrend.percentChange).toFixed(1)}%
              </div>
            </div>
            <div className="card p-6">
              <div className="text-3xl font-bold data-value text-[var(--foreground)]">
                {stats.avgLatency.toFixed(0)}ms
              </div>
              <div className="text-sm text-[var(--foreground-muted)]">Avg Latency</div>
              <div className={`text-xs mt-1 ${getTrendColor(stats.latencyTrend.direction, false)}`}>
                {getTrendIcon(stats.latencyTrend.direction)} {Math.abs(stats.latencyTrend.percentChange).toFixed(1)}%
              </div>
            </div>
            <div className="card p-6">
              <div className="text-3xl font-bold data-value text-[var(--foreground)]">
                ${stats.totalCost.toFixed(2)}
              </div>
              <div className="text-sm text-[var(--foreground-muted)]">Est. Total Cost</div>
            </div>
          </div>
        )}

        {/* Chart Selector */}
        <div className="tab-list mb-6">
          <button
            className={`tab ${activeChart === 'passRate' ? 'active' : ''}`}
            onClick={() => setActiveChart('passRate')}
          >
            Pass Rate
          </button>
          <button
            className={`tab ${activeChart === 'passAtK' ? 'active' : ''}`}
            onClick={() => setActiveChart('passAtK')}
          >
            Pass@K
          </button>
          <button
            className={`tab ${activeChart === 'latency' ? 'active' : ''}`}
            onClick={() => setActiveChart('latency')}
          >
            Latency
          </button>
          <button
            className={`tab ${activeChart === 'cost' ? 'active' : ''}`}
            onClick={() => setActiveChart('cost')}
          >
            Cost
          </button>
        </div>

        {/* Charts */}
        {trends.length > 0 ? (
          <div className="card p-6 mb-8">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'passRate' ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                      tickFormatter={(value) => `${value}%`}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '0',
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Pass Rate']}
                    />
                    <Area
                      type="monotone"
                      dataKey="passRatePercent"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      name="Pass Rate"
                    />
                  </AreaChart>
                ) : activeChart === 'passAtK' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                      tickFormatter={(value) => `${value}%`}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '0',
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="passAt1Percent" stroke="#ef4444" name="Pass@1" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="passAt3Percent" stroke="#f59e0b" name="Pass@3" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="passAt5Percent" stroke="#22c55e" name="Pass@5" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                ) : activeChart === 'latency' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                      tickFormatter={(value) => `${value}ms`}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '0',
                      }}
                      formatter={(value: number) => [`${value.toFixed(0)}ms`]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="avgLatency" stroke="#3b82f6" name="Avg" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="p50Latency" stroke="#8b5cf6" name="P50" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="p95Latency" stroke="#ef4444" name="P95" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                ) : (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis
                      tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }}
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '0',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(4)}`, 'Est. Cost']}
                    />
                    <Area
                      type="monotone"
                      dataKey="estimatedCost"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                      name="Est. Cost"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <div className="text-[var(--foreground-muted)]">
              No evaluation data available. Run some evaluations to see trends.
            </div>
            <Link href="/evals/new" className="btn btn-primary mt-4 inline-block">
              Create Evaluation
            </Link>
          </div>
        )}

        {/* Data Table */}
        {trends.length > 0 && (
          <div className="card">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Evaluation History
              </h2>
            </div>
            <table className="table-tactical">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Eval Name</th>
                  <th>Pass Rate</th>
                  <th>Pass@1</th>
                  <th>Avg Latency</th>
                  <th>Tokens</th>
                  <th>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((t) => (
                  <tr key={t.evalId}>
                    <td className="text-sm text-[var(--foreground-muted)]">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td>
                      <Link
                        href={`/evals/${t.evalId}`}
                        className="text-blue-600 hover:text-blue-500 font-medium"
                      >
                        {t.evalName}
                      </Link>
                    </td>
                    <td>
                      <span className={`data-value font-semibold ${
                        t.passRate >= 0.8 ? 'text-green-600' :
                        t.passRate >= 0.5 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {(t.passRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="data-value">
                      {(t.passAt1 * 100).toFixed(1)}%
                    </td>
                    <td className="data-value">
                      {t.avgLatency.toFixed(0)}ms
                    </td>
                    <td className="data-value text-[var(--foreground-muted)]">
                      {t.totalTokens.toLocaleString()}
                    </td>
                    <td className="data-value text-[var(--foreground-muted)]">
                      ${t.estimatedCost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
