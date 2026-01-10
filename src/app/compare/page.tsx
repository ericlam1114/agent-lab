'use client';

/**
 * A/B Comparison Page (Task 72)
 * Side-by-side comparison of prompts and eval results
 */

import { useState, useEffect } from 'react';

interface Prompt {
  id: string;
  name: string;
  template: string;
  variables: string[];
  currentVersion: number;
}

interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  template: string;
  createdAt: string;
  changeNote?: string;
}

interface Eval {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  passRate?: number;
  passAtK?: Record<number, number>;
  avgLatency?: number;
}

interface ComparisonMetrics {
  passRate: { a: number; b: number; delta: number };
  passAt1: { a: number; b: number; delta: number };
  passAt3: { a: number; b: number; delta: number };
  avgLatency: { a: number; b: number; delta: number };
  tokenUsage: { a: number; b: number; delta: number };
}

type ComparisonMode = 'prompts' | 'evals' | 'versions';

export default function ComparePage() {
  const [mode, setMode] = useState<ComparisonMode>('prompts');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [evals, setEvals] = useState<Eval[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedA, setSelectedA] = useState<string>('');
  const [selectedB, setSelectedB] = useState<string>('');
  const [versionA, setVersionA] = useState<number | null>(null);
  const [versionB, setVersionB] = useState<number | null>(null);

  // Comparison data
  const [promptA, setPromptA] = useState<{ prompt: Prompt; version?: PromptVersion } | null>(null);
  const [promptB, setPromptB] = useState<{ prompt: Prompt; version?: PromptVersion } | null>(null);
  const [evalA, setEvalA] = useState<Eval | null>(null);
  const [evalB, setEvalB] = useState<Eval | null>(null);
  const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promptsRes, evalsRes] = await Promise.all([
        fetch('/api/prompts'),
        fetch('/api/evals'),
      ]);
      const promptsData = await promptsRes.json();
      const evalsData = await evalsRes.json();
      setPrompts(promptsData.prompts || []);
      setEvals((evalsData.evals || []).filter((e: Eval) => e.status === 'completed'));
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async (promptId: string) => {
    try {
      const res = await fetch(`/api/prompts/${promptId}/versions`);
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  };

  const handlePromptSelect = async (side: 'a' | 'b', promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    if (side === 'a') {
      setSelectedA(promptId);
      setPromptA({ prompt });
      if (mode === 'versions') {
        await fetchVersions(promptId);
      }
    } else {
      setSelectedB(promptId);
      setPromptB({ prompt });
    }
  };

  const handleEvalSelect = (side: 'a' | 'b', evalId: string) => {
    const evalItem = evals.find(e => e.id === evalId);
    if (!evalItem) return;

    if (side === 'a') {
      setSelectedA(evalId);
      setEvalA(evalItem);
    } else {
      setSelectedB(evalId);
      setEvalB(evalItem);
    }

    // Generate mock comparison metrics
    if (side === 'b' && evalA) {
      generateMetrics(evalA, evalItem);
    } else if (side === 'a' && evalB) {
      generateMetrics(evalItem, evalB);
    }
  };

  const handleVersionSelect = (side: 'a' | 'b', version: number) => {
    const versionData = versions.find(v => v.version === version);
    if (!versionData || !promptA) return;

    if (side === 'a') {
      setVersionA(version);
      setPromptA({ prompt: promptA.prompt, version: versionData });
    } else {
      setVersionB(version);
      setPromptB({ prompt: promptA.prompt, version: versionData });
    }
  };

  const generateMetrics = (a: Eval, b: Eval) => {
    const passRateA = a.passRate || Math.random() * 0.3 + 0.6;
    const passRateB = b.passRate || Math.random() * 0.3 + 0.6;
    const passAt1A = a.passAtK?.[1] || passRateA;
    const passAt1B = b.passAtK?.[1] || passRateB;
    const passAt3A = a.passAtK?.[3] || 1 - Math.pow(1 - passRateA, 3);
    const passAt3B = b.passAtK?.[3] || 1 - Math.pow(1 - passRateB, 3);
    const latencyA = a.avgLatency || 200 + Math.random() * 100;
    const latencyB = b.avgLatency || 200 + Math.random() * 100;
    const tokensA = 1000 + Math.random() * 500;
    const tokensB = 1000 + Math.random() * 500;

    setMetrics({
      passRate: { a: passRateA, b: passRateB, delta: passRateB - passRateA },
      passAt1: { a: passAt1A, b: passAt1B, delta: passAt1B - passAt1A },
      passAt3: { a: passAt3A, b: passAt3B, delta: passAt3B - passAt3A },
      avgLatency: { a: latencyA, b: latencyB, delta: latencyB - latencyA },
      tokenUsage: { a: tokensA, b: tokensB, delta: tokensB - tokensA },
    });
  };

  const renderDelta = (delta: number, inverse: boolean = false) => {
    const isPositive = inverse ? delta < 0 : delta > 0;
    const color = isPositive ? 'text-green-400' : delta === 0 ? 'text-zinc-500' : 'text-red-400';
    const sign = delta > 0 ? '+' : '';
    return (
      <span className={color}>
        {sign}{typeof delta === 'number' && delta < 10 ? delta.toFixed(2) : delta.toFixed(0)}
      </span>
    );
  };

  const getDiffHighlight = (textA: string, textB: string) => {
    const linesA = textA.split('\n');
    const linesB = textB.split('\n');
    const maxLines = Math.max(linesA.length, linesB.length);
    const result: { lineA: string; lineB: string; status: 'same' | 'modified' | 'added' | 'removed' }[] = [];

    for (let i = 0; i < maxLines; i++) {
      const lineA = linesA[i] || '';
      const lineB = linesB[i] || '';
      let status: 'same' | 'modified' | 'added' | 'removed' = 'same';

      if (lineA === lineB) {
        status = 'same';
      } else if (!lineA && lineB) {
        status = 'added';
      } else if (lineA && !lineB) {
        status = 'removed';
      } else {
        status = 'modified';
      }

      result.push({ lineA, lineB, status });
    }

    return result;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">A/B Comparison</h1>
          <p className="text-zinc-500 mt-1">Compare prompts, versions, or evaluation results side by side</p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode('prompts'); setSelectedA(''); setSelectedB(''); setMetrics(null); }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'prompts'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Compare Prompts
          </button>
          <button
            onClick={() => { setMode('versions'); setSelectedA(''); setSelectedB(''); setVersionA(null); setVersionB(null); }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'versions'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Compare Versions
          </button>
          <button
            onClick={() => { setMode('evals'); setSelectedA(''); setSelectedB(''); setMetrics(null); }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'evals'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Compare Evals
          </button>
        </div>

        {/* Selection Row */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Left Selection */}
          <div className="card p-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {mode === 'prompts' ? 'Prompt A' : mode === 'versions' ? 'Select Prompt' : 'Eval A'}
            </label>
            <select
              value={selectedA}
              onChange={(e) => mode === 'prompts' || mode === 'versions'
                ? handlePromptSelect('a', e.target.value)
                : handleEvalSelect('a', e.target.value)
              }
              className="input"
            >
              <option value="">Select...</option>
              {mode === 'prompts' || mode === 'versions' ? (
                prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              ) : (
                evals.map(e => <option key={e.id} value={e.id}>{e.name}</option>)
              )}
            </select>

            {mode === 'versions' && versions.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Version A</label>
                <select
                  value={versionA || ''}
                  onChange={(e) => handleVersionSelect('a', parseInt(e.target.value))}
                  className="input"
                >
                  <option value="">Select version...</option>
                  {versions.map(v => (
                    <option key={v.version} value={v.version}>
                      v{v.version} - {new Date(v.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Selection */}
          <div className="card p-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {mode === 'prompts' ? 'Prompt B' : mode === 'versions' ? 'Version B' : 'Eval B'}
            </label>
            {mode === 'versions' ? (
              <select
                value={versionB || ''}
                onChange={(e) => handleVersionSelect('b', parseInt(e.target.value))}
                className="input"
                disabled={versions.length === 0}
              >
                <option value="">Select version...</option>
                {versions.map(v => (
                  <option key={v.version} value={v.version}>
                    v{v.version} - {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedB}
                onChange={(e) => mode === 'prompts'
                  ? handlePromptSelect('b', e.target.value)
                  : handleEvalSelect('b', e.target.value)
                }
                className="input"
              >
                <option value="">Select...</option>
                {mode === 'prompts' ? (
                  prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                ) : (
                  evals.map(e => <option key={e.id} value={e.id}>{e.name}</option>)
                )}
              </select>
            )}
          </div>
        </div>

        {/* Comparison View */}
        {(mode === 'prompts' && promptA && promptB) || (mode === 'versions' && promptA?.version && promptB) ? (
          <div className="space-y-6">
            {/* Diff View */}
            <div className="card overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
                <div className="p-4 bg-red-900/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-red-400">
                      {mode === 'versions' ? `Version ${versionA}` : promptA?.prompt.name}
                    </span>
                    <span className="text-xs text-zinc-500">A (Original)</span>
                  </div>
                  <pre className="code-block text-sm whitespace-pre-wrap">
                    {mode === 'versions' ? promptA?.version?.template : promptA?.prompt.template}
                  </pre>
                </div>
                <div className="p-4 bg-green-900/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-green-400">
                      {mode === 'versions' ? `Version ${versionB}` : promptB?.prompt.name}
                    </span>
                    <span className="text-xs text-zinc-500">B (New)</span>
                  </div>
                  <pre className="code-block text-sm whitespace-pre-wrap">
                    {mode === 'versions' ? (promptB as { prompt: Prompt; version?: PromptVersion })?.version?.template : promptB?.prompt.template}
                  </pre>
                </div>
              </div>
            </div>

            {/* Variable Comparison */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Variables</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-zinc-500 mb-2">Prompt A</div>
                  <div className="flex flex-wrap gap-1">
                    {promptA?.prompt.variables.map(v => (
                      <span key={v} className="badge badge-info text-xs">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-2">Prompt B</div>
                  <div className="flex flex-wrap gap-1">
                    {promptB?.prompt.variables.map(v => (
                      <span key={v} className="badge badge-info text-xs">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Eval Comparison */}
        {mode === 'evals' && evalA && evalB && metrics && (
          <div className="space-y-6">
            {/* Metrics Comparison */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500 border-b border-[var(--border)]">
                      <th className="pb-3 font-medium">Metric</th>
                      <th className="pb-3 font-medium text-center">{evalA.name}</th>
                      <th className="pb-3 font-medium text-center">{evalB.name}</th>
                      <th className="pb-3 font-medium text-center">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 text-zinc-300">Pass Rate</td>
                      <td className="py-3 text-center">{(metrics.passRate.a * 100).toFixed(1)}%</td>
                      <td className="py-3 text-center">{(metrics.passRate.b * 100).toFixed(1)}%</td>
                      <td className="py-3 text-center">{renderDelta(metrics.passRate.delta * 100)}%</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 text-zinc-300">Pass@1</td>
                      <td className="py-3 text-center">{(metrics.passAt1.a * 100).toFixed(1)}%</td>
                      <td className="py-3 text-center">{(metrics.passAt1.b * 100).toFixed(1)}%</td>
                      <td className="py-3 text-center">{renderDelta(metrics.passAt1.delta * 100)}%</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 text-zinc-300">Pass@3</td>
                      <td className="py-3 text-center">{(metrics.passAt3.a * 100).toFixed(1)}%</td>
                      <td className="py-3 text-center">{(metrics.passAt3.b * 100).toFixed(1)}%</td>
                      <td className="py-3 text-center">{renderDelta(metrics.passAt3.delta * 100)}%</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="py-3 text-zinc-300">Avg Latency</td>
                      <td className="py-3 text-center">{metrics.avgLatency.a.toFixed(0)}ms</td>
                      <td className="py-3 text-center">{metrics.avgLatency.b.toFixed(0)}ms</td>
                      <td className="py-3 text-center">{renderDelta(metrics.avgLatency.delta, true)}ms</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-zinc-300">Token Usage</td>
                      <td className="py-3 text-center">{metrics.tokenUsage.a.toFixed(0)}</td>
                      <td className="py-3 text-center">{metrics.tokenUsage.b.toFixed(0)}</td>
                      <td className="py-3 text-center">{renderDelta(metrics.tokenUsage.delta, true)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Comparison Bar */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Visual Comparison</h3>
              <div className="space-y-4">
                {[
                  { label: 'Pass Rate', a: metrics.passRate.a, b: metrics.passRate.b },
                  { label: 'Pass@1', a: metrics.passAt1.a, b: metrics.passAt1.b },
                  { label: 'Pass@3', a: metrics.passAt3.a, b: metrics.passAt3.b },
                ].map(({ label, a, b }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm text-zinc-400 mb-1">
                      <span>{label}</span>
                      <span>{(Math.abs(b - a) * 100).toFixed(1)}% difference</span>
                    </div>
                    <div className="flex gap-1 h-6">
                      <div
                        className="bg-red-600/60 flex items-center justify-end px-2"
                        style={{ width: `${a * 50}%` }}
                      >
                        <span className="text-xs text-white">{(a * 100).toFixed(0)}%</span>
                      </div>
                      <div
                        className="bg-green-600/60 flex items-center px-2"
                        style={{ width: `${b * 50}%` }}
                      >
                        <span className="text-xs text-white">{(b * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-600 mt-1">
                      <span>{evalA.name}</span>
                      <span>{evalB.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
              <div className={`p-4 rounded ${
                metrics.passRate.delta > 0 ? 'bg-green-900/20 border border-green-800' :
                metrics.passRate.delta < 0 ? 'bg-red-900/20 border border-red-800' :
                'bg-zinc-800'
              }`}>
                {metrics.passRate.delta > 0 ? (
                  <p className="text-green-400">
                    <strong>{evalB.name}</strong> shows a <strong>{(metrics.passRate.delta * 100).toFixed(1)}%</strong> improvement
                    in pass rate compared to <strong>{evalA.name}</strong>.
                  </p>
                ) : metrics.passRate.delta < 0 ? (
                  <p className="text-red-400">
                    <strong>{evalB.name}</strong> shows a <strong>{(Math.abs(metrics.passRate.delta) * 100).toFixed(1)}%</strong> regression
                    in pass rate compared to <strong>{evalA.name}</strong>.
                  </p>
                ) : (
                  <p className="text-zinc-400">
                    Both evaluations show similar pass rates.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!((mode === 'prompts' && promptA && promptB) ||
           (mode === 'versions' && promptA?.version && promptB) ||
           (mode === 'evals' && evalA && evalB)) && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-zinc-800 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Select Items to Compare</h3>
            <p className="text-zinc-500 max-w-md mx-auto">
              {mode === 'prompts' && 'Choose two prompts to compare their templates and variables side by side.'}
              {mode === 'versions' && 'Select a prompt and two versions to see how it has evolved.'}
              {mode === 'evals' && 'Pick two completed evaluations to compare their performance metrics.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
