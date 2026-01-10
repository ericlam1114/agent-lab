'use client';

/**
 * Optimize Page (Task 71)
 * DSPy-style prompt optimization UI
 */

import { useState, useEffect } from 'react';

interface Prompt {
  id: string;
  name: string;
  template: string;
  variables: string[];
}

interface Dataset {
  id: string;
  name: string;
  rowCount: number;
  variables: string[];
}

interface OptimizationConfig {
  promptId: string;
  datasetId: string;
  strategy: 'bootstrap' | 'mipro' | 'random';
  metric: 'pass_rate' | 'pass_at_1' | 'pass_at_k' | 'avg_score';
  iterations: number;
  candidatesPerRound: number;
  kValue: number;
  maxFewShotExamples: number;
  temperature: number;
  earlyStopThreshold: number | null;
}

interface CandidateResult {
  id: string;
  prompt: string;
  generation: number;
  score: number;
  passRate: number;
  passAtK: Record<number, number>;
}

interface OptimizationResult {
  bestCandidate: {
    id: string;
    prompt: string;
    generation: number;
  };
  bestScore: number;
  history: CandidateResult[];
  improvementPercent: number;
  totalEvaluations: number;
  stoppedEarly: boolean;
}

interface OptimizationProgress {
  currentGeneration: number;
  totalGenerations: number;
  currentCandidate: number;
  totalCandidates: number;
  bestScoreSoFar: number;
  status: 'idle' | 'running' | 'completed' | 'stopped' | 'error';
}

export default function OptimizePage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState<OptimizationConfig>({
    promptId: '',
    datasetId: '',
    strategy: 'mipro',
    metric: 'pass_rate',
    iterations: 5,
    candidatesPerRound: 3,
    kValue: 1,
    maxFewShotExamples: 5,
    temperature: 0.7,
    earlyStopThreshold: null,
  });

  const [progress, setProgress] = useState<OptimizationProgress>({
    currentGeneration: 0,
    totalGenerations: 0,
    currentCandidate: 0,
    totalCandidates: 0,
    bestScoreSoFar: 0,
    status: 'idle',
  });

  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promptsRes, datasetsRes] = await Promise.all([
        fetch('/api/prompts'),
        fetch('/api/datasets'),
      ]);
      const promptsData = await promptsRes.json();
      const datasetsData = await datasetsRes.json();
      setPrompts(promptsData.prompts || []);
      setDatasets(datasetsData.datasets || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSelect = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    setSelectedPrompt(prompt || null);
    setConfig(prev => ({ ...prev, promptId }));
  };

  const runOptimization = async () => {
    if (!config.promptId || !config.datasetId) {
      setError('Please select a prompt and dataset');
      return;
    }

    setError(null);
    setResult(null);
    setProgress({
      currentGeneration: 0,
      totalGenerations: config.iterations,
      currentCandidate: 0,
      totalCandidates: 0,
      bestScoreSoFar: 0,
      status: 'running',
    });

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Optimization failed');
      }

      const data = await response.json();
      setResult(data);
      setProgress(prev => ({ ...prev, status: 'completed' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
      setProgress(prev => ({ ...prev, status: 'error' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
          <h1 className="text-2xl font-bold text-white">Prompt Optimizer</h1>
          <p className="text-zinc-500 mt-1">DSPy-style automatic prompt optimization</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Configuration</h2>

              {/* Prompt Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Prompt Template</label>
                <select
                  value={config.promptId}
                  onChange={(e) => handlePromptSelect(e.target.value)}
                  className="input"
                >
                  <option value="">Select a prompt...</option>
                  {prompts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Dataset Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Dataset</label>
                <select
                  value={config.datasetId}
                  onChange={(e) => setConfig(prev => ({ ...prev, datasetId: e.target.value }))}
                  className="input"
                >
                  <option value="">Select a dataset...</option>
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.rowCount} rows)</option>
                  ))}
                </select>
              </div>

              {/* Strategy */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Strategy</label>
                <select
                  value={config.strategy}
                  onChange={(e) => setConfig(prev => ({ ...prev, strategy: e.target.value as typeof config.strategy }))}
                  className="input"
                >
                  <option value="mipro">MIPRO (LLM-guided)</option>
                  <option value="bootstrap">Bootstrap Few-shot</option>
                  <option value="random">Random Perturbations</option>
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  {config.strategy === 'mipro' && 'Uses Claude to generate improved prompts based on failures'}
                  {config.strategy === 'bootstrap' && 'Adds successful examples as few-shot context'}
                  {config.strategy === 'random' && 'Applies random improvements like chain-of-thought'}
                </p>
              </div>

              {/* Metric */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Optimization Metric</label>
                <select
                  value={config.metric}
                  onChange={(e) => setConfig(prev => ({ ...prev, metric: e.target.value as typeof config.metric }))}
                  className="input"
                >
                  <option value="pass_rate">Pass Rate</option>
                  <option value="pass_at_1">Pass@1</option>
                  <option value="pass_at_k">Pass@k</option>
                  <option value="avg_score">Average Score</option>
                </select>
              </div>

              {config.metric === 'pass_at_k' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">K Value</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={config.kValue}
                    onChange={(e) => setConfig(prev => ({ ...prev, kValue: parseInt(e.target.value) }))}
                    className="input"
                  />
                </div>
              )}

              {/* Iterations */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Iterations: {config.iterations}
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={config.iterations}
                  onChange={(e) => setConfig(prev => ({ ...prev, iterations: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Candidates per Round */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Candidates per Round: {config.candidatesPerRound}
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={config.candidatesPerRound}
                  onChange={(e) => setConfig(prev => ({ ...prev, candidatesPerRound: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Temperature (for MIPRO) */}
              {config.strategy === 'mipro' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Temperature: {config.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={config.temperature}
                    onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Max Few-shot (for Bootstrap) */}
              {config.strategy === 'bootstrap' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Max Few-shot Examples: {config.maxFewShotExamples}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={config.maxFewShotExamples}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxFewShotExamples: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Early Stop */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <input
                    type="checkbox"
                    checked={config.earlyStopThreshold !== null}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      earlyStopThreshold: e.target.checked ? 0.95 : null
                    }))}
                    className="rounded border-zinc-600"
                  />
                  Early stopping at {config.earlyStopThreshold ? `${(config.earlyStopThreshold * 100).toFixed(0)}%` : '95%'}
                </label>
              </div>

              <button
                onClick={runOptimization}
                disabled={!config.promptId || !config.datasetId || progress.status === 'running'}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {progress.status === 'running' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Optimizing...
                  </span>
                ) : 'Start Optimization'}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-800 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Selected Prompt Preview */}
            {selectedPrompt && (
              <div className="card p-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Current Prompt</h3>
                <pre className="code-block text-xs overflow-auto max-h-48">
                  {selectedPrompt.template}
                </pre>
                {selectedPrompt.variables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {selectedPrompt.variables.map(v => (
                      <span key={v} className="badge badge-info text-xs">{`{{${v}}}`}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {progress.status === 'running' && (
              <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Optimization Progress</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-zinc-400 mb-1">
                      <span>Generation {progress.currentGeneration} of {progress.totalGenerations}</span>
                      <span>{Math.round((progress.currentGeneration / progress.totalGenerations) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${(progress.currentGeneration / progress.totalGenerations) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 p-3">
                      <div className="text-xs text-zinc-500">Best Score So Far</div>
                      <div className="text-xl font-bold text-white">
                        {(progress.bestScoreSoFar * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-zinc-900 p-3">
                      <div className="text-xs text-zinc-500">Current Candidate</div>
                      <div className="text-xl font-bold text-white">
                        {progress.currentCandidate} / {progress.totalCandidates}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <>
                {/* Summary */}
                <div className="card p-6 mb-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Optimization Results</h2>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-zinc-900 p-4">
                      <div className="text-xs text-zinc-500">Best Score</div>
                      <div className="text-2xl font-bold text-green-400">
                        {(result.bestScore * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-zinc-900 p-4">
                      <div className="text-xs text-zinc-500">Improvement</div>
                      <div className={`text-2xl font-bold ${result.improvementPercent > 0 ? 'text-green-400' : 'text-zinc-400'}`}>
                        {result.improvementPercent > 0 ? '+' : ''}{result.improvementPercent.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-zinc-900 p-4">
                      <div className="text-xs text-zinc-500">Evaluations</div>
                      <div className="text-2xl font-bold text-white">
                        {result.totalEvaluations}
                      </div>
                    </div>
                    <div className="bg-zinc-900 p-4">
                      <div className="text-xs text-zinc-500">Status</div>
                      <div className="text-2xl font-bold text-white">
                        {result.stoppedEarly ? 'Early Stop' : 'Complete'}
                      </div>
                    </div>
                  </div>

                  {/* Best Prompt */}
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">Optimized Prompt</h3>
                    <pre className="code-block text-sm overflow-auto max-h-64">
                      {result.bestCandidate.prompt}
                    </pre>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(result.bestCandidate.prompt)}
                        className="btn btn-secondary text-sm"
                      >
                        Copy Prompt
                      </button>
                      <button className="btn btn-primary text-sm">
                        Save as New Version
                      </button>
                    </div>
                  </div>
                </div>

                {/* Candidate History */}
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Candidate History</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-zinc-500 border-b border-[var(--border)]">
                          <th className="pb-3 font-medium">Gen</th>
                          <th className="pb-3 font-medium">Score</th>
                          <th className="pb-3 font-medium">Pass Rate</th>
                          <th className="pb-3 font-medium">Pass@1</th>
                          <th className="pb-3 font-medium">Prompt Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.history.map((candidate, idx) => (
                          <tr
                            key={candidate.id}
                            className={`border-b border-[var(--border)] ${
                              candidate.id === result.bestCandidate.id ? 'bg-green-900/20' : ''
                            }`}
                          >
                            <td className="py-3">{candidate.generation}</td>
                            <td className="py-3">
                              <span className={`font-medium ${
                                candidate.id === result.bestCandidate.id ? 'text-green-400' : 'text-white'
                              }`}>
                                {(candidate.score * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3">{(candidate.passRate * 100).toFixed(1)}%</td>
                            <td className="py-3">{((candidate.passAtK[1] || 0) * 100).toFixed(1)}%</td>
                            <td className="py-3 max-w-xs truncate text-zinc-400">
                              {candidate.prompt.substring(0, 100)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {progress.status === 'idle' && !result && (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Ready to Optimize</h3>
                <p className="text-zinc-500 max-w-md mx-auto">
                  Select a prompt and dataset, configure your optimization settings, then click Start Optimization to begin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
