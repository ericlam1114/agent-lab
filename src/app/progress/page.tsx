'use client';

/**
 * Progress Page (Task 47)
 * Real-time evaluation progress with WebSocket updates
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RunningEval {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  totalTasks: number;
  completedTasks: number;
  passedTrials: number;
  totalTrials: number;
  startedAt: string;
  estimatedRemaining?: number;
}

interface TaskResult {
  taskId: string;
  description: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  score?: number;
  completedAt?: string;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="progress-bar w-full">
      <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}

function RunningEvalCard({ evaluation, taskResults }: { evaluation: RunningEval; taskResults: TaskResult[] }) {
  const progress = evaluation.totalTasks > 0
    ? (evaluation.completedTasks / evaluation.totalTasks) * 100
    : 0;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{evaluation.name}</h3>
          <p className="text-sm text-zinc-500">
            Started {new Date(evaluation.startedAt).toLocaleTimeString()}
          </p>
        </div>
        <span className="badge badge-running animate-pulse-tactical">
          RUNNING
        </span>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">Progress</span>
          <span className="text-white data-value">{progress.toFixed(0)}%</span>
        </div>
        <ProgressBar value={evaluation.completedTasks} max={evaluation.totalTasks} />
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>{evaluation.completedTasks} of {evaluation.totalTasks} tasks</span>
          {evaluation.estimatedRemaining && (
            <span>~{Math.ceil(evaluation.estimatedRemaining / 1000)}s remaining</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-white data-value">{evaluation.completedTasks}</div>
          <div className="text-xs text-zinc-500">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-500 data-value">{evaluation.passedTrials}</div>
          <div className="text-xs text-zinc-500">Passed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500 data-value">
            {evaluation.totalTrials - evaluation.passedTrials}
          </div>
          <div className="text-xs text-zinc-500">Failed</div>
        </div>
      </div>

      {/* Task Results */}
      {taskResults.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Recent Results
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {taskResults.slice(-5).reverse().map((task) => (
              <div key={task.taskId} className="flex items-center justify-between p-2 bg-zinc-900/50">
                <span className="text-sm text-zinc-300 truncate flex-1">{task.description}</span>
                {task.status === 'running' ? (
                  <span className="badge badge-running text-xs">RUNNING</span>
                ) : task.status === 'passed' ? (
                  <span className="badge badge-pass text-xs">PASS</span>
                ) : task.status === 'failed' ? (
                  <span className="badge badge-fail text-xs">FAIL</span>
                ) : (
                  <span className="badge badge-warning text-xs">PENDING</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Button */}
      <button className="btn btn-danger w-full mt-4">
        Cancel Evaluation
      </button>
    </div>
  );
}

export default function ProgressPage() {
  const [runningEvals, setRunningEvals] = useState<RunningEval[]>([]);
  const [taskResults, setTaskResults] = useState<Record<string, TaskResult[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch currently running evaluations
    const fetchRunningEvals = async () => {
      try {
        const response = await fetch('/api/evals?status=running');
        const data = await response.json();
        setRunningEvals(data.evals || []);
      } catch (error) {
        console.error('Failed to fetch running evals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRunningEvals();

    // Poll for updates (in production, use WebSocket)
    const interval = setInterval(fetchRunningEvals, 2000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Progress</h1>
            <p className="text-zinc-500 mt-1">Monitor running evaluations in real-time</p>
          </div>
          <Link href="/evals/new" className="btn btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Eval
          </Link>
        </div>

        {/* Running Evaluations or Empty State */}
        {runningEvals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-16 h-16 mx-auto text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No running evaluations</h3>
            <p className="text-zinc-500 mb-6">Start a new evaluation to see progress here</p>
            <Link href="/evals/new" className="btn btn-primary">
              Create New Evaluation
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {runningEvals.map((evalItem) => (
              <RunningEvalCard
                key={evalItem.id}
                evaluation={evalItem}
                taskResults={taskResults[evalItem.id] || []}
              />
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 card p-4 bg-blue-900/20 border-blue-600">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-300">
              <strong>Tip:</strong> You can also run evaluations from the command line with{' '}
              <code className="bg-blue-900/50 px-1">npm run agenteval -- run</code> and view progress here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
