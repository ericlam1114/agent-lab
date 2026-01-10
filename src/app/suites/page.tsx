'use client';

/**
 * Eval Suites Page (Task 73)
 * Manage and run evaluation suites
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SuiteTask {
  id: string;
  taskConfig: {
    description: string;
    type?: string;
  };
  order: number;
}

interface SuiteRun {
  id: string;
  status: 'running' | 'completed' | 'failed';
  results?: {
    tasksTotal: number;
    tasksCompleted: number;
    passRate: number;
  };
  createdAt: string;
  completedAt?: string;
}

interface Suite {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  runCount: number;
  latestRun?: SuiteRun;
  createdAt: string;
  updatedAt: string;
}

function CreateSuiteModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; taskConfigs: object[] }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [taskDescriptions, setTaskDescriptions] = useState<string[]>(['']);

  if (!isOpen) return null;

  const addTask = () => {
    setTaskDescriptions([...taskDescriptions, '']);
  };

  const removeTask = (index: number) => {
    setTaskDescriptions(taskDescriptions.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, value: string) => {
    const updated = [...taskDescriptions];
    updated[index] = value;
    setTaskDescriptions(updated);
  };

  const handleSave = () => {
    const taskConfigs = taskDescriptions
      .filter(d => d.trim())
      .map((description, i) => ({
        id: `task_${i}`,
        description,
        type: 'coding',
        input: { prompt: description },
        graders: [{ type: 'contains', value: 'expected' }],
      }));

    onSave({ name, description, taskConfigs });
    setName('');
    setDescription('');
    setTaskDescriptions(['']);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-white">Create Eval Suite</h2>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Core Capabilities Suite"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this eval suite..."
              rows={2}
              className="input resize-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-300">Tasks</label>
              <button
                onClick={addTask}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Add Task
              </button>
            </div>
            <div className="space-y-2">
              {taskDescriptions.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => updateTask(index, e.target.value)}
                    placeholder={`Task ${index + 1} description...`}
                    className="input flex-1"
                  />
                  {taskDescriptions.length > 1 && (
                    <button
                      onClick={() => removeTask(index)}
                      className="px-3 text-zinc-500 hover:text-red-400"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!name || taskDescriptions.every(t => !t.trim())}
            className="btn btn-primary disabled:opacity-50"
          >
            Create Suite
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuitesPage() {
  const [suites, setSuites] = useState<Suite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSuites();
  }, []);

  const fetchSuites = async () => {
    try {
      const response = await fetch('/api/suites');
      const data = await response.json();
      setSuites(data.suites || []);
    } catch (error) {
      console.error('Failed to fetch suites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuite = async (data: { name: string; description: string; taskConfigs: object[] }) => {
    try {
      await fetch('/api/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchSuites();
    } catch (error) {
      console.error('Failed to create suite:', error);
    }
  };

  const handleRunSuite = async (suiteId: string) => {
    try {
      setRunningIds(prev => new Set([...prev, suiteId]));

      await fetch(`/api/suites/${suiteId}`, {
        method: 'POST',
      });

      // Poll for completion
      const checkStatus = async () => {
        const res = await fetch(`/api/suites/${suiteId}`);
        const data = await res.json();
        const latestRun = data.suite?.runs?.[0];

        if (latestRun?.status === 'completed') {
          setRunningIds(prev => {
            const next = new Set(prev);
            next.delete(suiteId);
            return next;
          });
          fetchSuites();
        } else {
          setTimeout(checkStatus, 1000);
        }
      };

      setTimeout(checkStatus, 1000);
    } catch (error) {
      console.error('Failed to run suite:', error);
      setRunningIds(prev => {
        const next = new Set(prev);
        next.delete(suiteId);
        return next;
      });
    }
  };

  const handleDeleteSuite = async (suiteId: string) => {
    if (!confirm('Are you sure you want to delete this suite?')) return;

    try {
      await fetch(`/api/suites/${suiteId}`, {
        method: 'DELETE',
      });
      fetchSuites();
    } catch (error) {
      console.error('Failed to delete suite:', error);
    }
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Eval Suites</h1>
            <p className="text-zinc-500 mt-1">Group and run evaluations together</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Suite
          </button>
        </div>

        {/* Suites List */}
        {suites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-16 h-16 mx-auto text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No eval suites yet</h3>
            <p className="text-zinc-500 mb-6">Create suites to group and run evaluations together</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Create Your First Suite
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {suites.map((suite) => (
              <div key={suite.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{suite.name}</h3>
                      <span className="badge badge-info">{suite.taskCount} tasks</span>
                      {suite.latestRun && (
                        <span className={`badge ${
                          suite.latestRun.status === 'completed'
                            ? 'badge-success'
                            : suite.latestRun.status === 'running'
                            ? 'badge-warning'
                            : 'badge-error'
                        }`}>
                          {suite.latestRun.status}
                        </span>
                      )}
                    </div>
                    {suite.description && (
                      <p className="text-sm text-zinc-400 mt-1">{suite.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500">
                      <span>{suite.runCount} runs</span>
                      {suite.latestRun?.results && (
                        <span>
                          Last pass rate: {((suite.latestRun.results.passRate || 0) * 100).toFixed(1)}%
                        </span>
                      )}
                      <span>Updated {new Date(suite.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunSuite(suite.id)}
                      disabled={runningIds.has(suite.id)}
                      className="btn btn-primary text-sm disabled:opacity-50"
                    >
                      {runningIds.has(suite.id) ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Running...
                        </span>
                      ) : 'Run Suite'}
                    </button>
                    <Link
                      href={`/suites/${suite.id}`}
                      className="btn btn-secondary text-sm"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleDeleteSuite(suite.id)}
                      className="btn btn-secondary text-sm text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Latest Run Results */}
                {suite.latestRun?.status === 'completed' && suite.latestRun.results && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-zinc-900 p-3">
                        <div className="text-xs text-zinc-500">Pass Rate</div>
                        <div className="text-xl font-bold text-green-400">
                          {((suite.latestRun.results.passRate || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-zinc-900 p-3">
                        <div className="text-xs text-zinc-500">Tasks Completed</div>
                        <div className="text-xl font-bold text-white">
                          {suite.latestRun.results.tasksCompleted}/{suite.latestRun.results.tasksTotal}
                        </div>
                      </div>
                      <div className="bg-zinc-900 p-3">
                        <div className="text-xs text-zinc-500">Total Runs</div>
                        <div className="text-xl font-bold text-white">{suite.runCount}</div>
                      </div>
                      <div className="bg-zinc-900 p-3">
                        <div className="text-xs text-zinc-500">Last Run</div>
                        <div className="text-lg font-medium text-white">
                          {new Date(suite.latestRun.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <CreateSuiteModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateSuite}
        />
      </div>
    </div>
  );
}
