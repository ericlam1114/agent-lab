'use client';

/**
 * ResultsTable Component (Task 28)
 * Matrix view showing tasks (rows) x trials (columns)
 */

import { useState, useMemo } from 'react';

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
  latencyMs?: number;
  graderResults: GraderResult[];
}

interface Task {
  id: string;
  description: string;
  type: string;
  avgScore: number;
  passRate: number;
  trials: Trial[];
}

interface ResultsTableProps {
  tasks: Task[];
  onTrialClick?: (taskId: string, trialId: string) => void;
}

type SortField = 'description' | 'avgScore' | 'passRate';
type SortOrder = 'asc' | 'desc';

export function ResultsTable({ tasks, onTrialClick }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('description');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const maxTrials = useMemo(
    () => Math.max(...tasks.map((t) => t.trials.length), 0),
    [tasks]
  );

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Filter by status
    if (statusFilter === 'passed') {
      filtered = filtered.filter((t) => t.passRate >= 0.5);
    } else if (statusFilter === 'failed') {
      filtered = filtered.filter((t) => t.passRate < 0.5);
    }

    // Sort
    filtered.sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'description') {
        return multiplier * a.description.localeCompare(b.description);
      } else if (sortField === 'avgScore') {
        return multiplier * (a.avgScore - b.avgScore);
      } else {
        return multiplier * (a.passRate - b.passRate);
      }
    });

    return filtered;
  }, [tasks, sortField, sortOrder, statusFilter]);

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="w-full overflow-x-auto">
      {/* Filters */}
      <div className="mb-4 flex gap-4 items-center">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Filter:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800"
        >
          <option value="all">All Tasks</option>
          <option value="passed">Passed Only</option>
          <option value="failed">Failed Only</option>
        </select>
      </div>

      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-zinc-100 dark:bg-zinc-800">
            <th
              className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => handleSort('description')}
            >
              Task <span className={sortField !== 'description' ? 'opacity-30' : ''}>{getSortIcon('description')}</span>
            </th>
            <th
              className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => handleSort('avgScore')}
            >
              Avg Score <span className={sortField !== 'avgScore' ? 'opacity-30' : ''}>{getSortIcon('avgScore')}</span>
            </th>
            <th
              className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
              onClick={() => handleSort('passRate')}
            >
              Pass Rate <span className={sortField !== 'passRate' ? 'opacity-30' : ''}>{getSortIcon('passRate')}</span>
            </th>
            {Array.from({ length: maxTrials }, (_, i) => (
              <th
                key={i}
                className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Trial {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredAndSortedTasks.map((task) => (
            <>
              <tr
                key={task.id}
                className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-4 py-3">
                  <button
                    className="text-left hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={() =>
                      setExpandedTask(expandedTask === task.id ? null : task.id)
                    }
                  >
                    <span className="mr-2">{expandedTask === task.id ? '▼' : '▶'}</span>
                    <span className="text-sm font-medium">{task.description}</span>
                    <span className="ml-2 text-xs text-zinc-500">({task.type})</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(task.avgScore)}`}
                  >
                    {(task.avgScore * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm">
                    {(task.passRate * 100).toFixed(0)}%
                  </span>
                </td>
                {Array.from({ length: maxTrials }, (_, i) => {
                  const trial = task.trials[i];
                  if (!trial) {
                    return (
                      <td key={i} className="px-4 py-3 text-center">
                        <span className="text-zinc-300">-</span>
                      </td>
                    );
                  }
                  return (
                    <td key={trial.id} className="px-4 py-3 text-center">
                      <button
                        onClick={() => onTrialClick?.(task.id, trial.id)}
                        className={`px-3 py-1 rounded text-xs font-medium ${getScoreColor(trial.score)} hover:opacity-80`}
                      >
                        {trial.passed ? '✓' : '✗'} {(trial.score * 100).toFixed(0)}%
                      </button>
                    </td>
                  );
                })}
              </tr>
              {expandedTask === task.id && (
                <tr key={`${task.id}-expanded`}>
                  <td
                    colSpan={3 + maxTrials}
                    className="px-8 py-4 bg-zinc-50 dark:bg-zinc-800/30"
                  >
                    <div className="text-sm">
                      <h4 className="font-semibold mb-2">Grader Results</h4>
                      {task.trials[0]?.graderResults.map((gr) => (
                        <div
                          key={gr.id}
                          className="flex items-center gap-4 py-1 border-b border-zinc-200 dark:border-zinc-700 last:border-0"
                        >
                          <span className="font-medium w-32">{gr.graderId}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${getScoreColor(gr.score)}`}
                          >
                            {(gr.score * 100).toFixed(0)}%
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {gr.details}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      {filteredAndSortedTasks.length === 0 && (
        <div className="text-center py-8 text-zinc-500">No tasks found</div>
      )}
    </div>
  );
}
