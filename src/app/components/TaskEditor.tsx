'use client';

/**
 * TaskEditor Component (Task 30)
 * Visual editor for creating/editing tasks
 */

import { useState, useCallback, useId } from 'react';
import * as yaml from 'yaml';

interface GraderConfig {
  type: string;
  value?: string;
  threshold?: number;
  rubric?: string;
  command?: string;
}

interface TaskConfig {
  id: string;
  type: string;
  description: string;
  input: {
    prompt?: string;
    messages?: Array<{ role: string; content: string }>;
  };
  graders: GraderConfig[];
}

interface TaskEditorProps {
  initialTask?: TaskConfig;
  onSave?: (task: TaskConfig) => void;
  onCancel?: () => void;
}

const GRADER_TYPES = [
  { value: 'exact-match', label: 'Exact Match', requiresValue: true },
  { value: 'contains', label: 'Contains', requiresValue: true },
  { value: 'regex', label: 'Regex', requiresValue: true },
  { value: 'fuzzy-match', label: 'Fuzzy Match', requiresValue: true, hasThreshold: true },
  { value: 'json-valid', label: 'JSON Valid', requiresValue: false },
  { value: 'llm-rubric', label: 'LLM Rubric', requiresRubric: true },
  { value: 'test-runner', label: 'Test Runner', requiresCommand: true },
  { value: 'human-review', label: 'Human Review', requiresValue: false },
];

const TASK_TYPES = ['coding', 'conversational', 'research', 'computer-use'];

export function TaskEditor({ initialTask, onSave, onCancel }: TaskEditorProps) {
  const generatedId = useId();

  const [task, setTask] = useState<TaskConfig>(() =>
    initialTask || {
      id: `task-${generatedId.replace(/:/g, '')}`,
      type: 'coding',
      description: '',
      input: { prompt: '' },
      graders: [],
    }
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [showYaml, setShowYaml] = useState(false);

  const updateTask = useCallback((updates: Partial<TaskConfig>) => {
    setTask((prev) => ({ ...prev, ...updates }));
  }, []);

  const addGrader = () => {
    setTask((prev) => ({
      ...prev,
      graders: [...prev.graders, { type: 'exact-match', value: '' }],
    }));
  };

  const updateGrader = (index: number, updates: Partial<GraderConfig>) => {
    setTask((prev) => ({
      ...prev,
      graders: prev.graders.map((g, i) => (i === index ? { ...g, ...updates } : g)),
    }));
  };

  const removeGrader = (index: number) => {
    setTask((prev) => ({
      ...prev,
      graders: prev.graders.filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!task.id.trim()) newErrors.push('Task ID is required');
    if (!task.description.trim()) newErrors.push('Description is required');
    if (!task.input.prompt?.trim() && !task.input.messages?.length) {
      newErrors.push('Input prompt or messages is required');
    }
    if (task.graders.length === 0) {
      newErrors.push('At least one grader is required');
    }

    task.graders.forEach((grader, index) => {
      const graderType = GRADER_TYPES.find((g) => g.value === grader.type);
      if (graderType?.requiresValue && !grader.value?.trim()) {
        newErrors.push(`Grader ${index + 1}: Value is required`);
      }
      if (graderType?.requiresRubric && !grader.rubric?.trim()) {
        newErrors.push(`Grader ${index + 1}: Rubric is required`);
      }
      if (graderType?.requiresCommand && !grader.command?.trim()) {
        newErrors.push(`Grader ${index + 1}: Command is required`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave?.(task);
    }
  };

  const getYamlOutput = () => {
    return yaml.stringify({
      tasks: [task],
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Basic Info */}
      <div className="mb-6 space-y-4">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Task Configuration
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Task ID
            </label>
            <input
              type="text"
              value={task.id}
              onChange={(e) => updateTask({ id: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
              placeholder="e.g., task-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Type
            </label>
            <select
              value={task.type}
              onChange={(e) => updateTask({ type: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
            >
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={task.description}
            onChange={(e) => updateTask({ description: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
            placeholder="Describe what this task evaluates"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Input Prompt
          </label>
          <textarea
            value={task.input.prompt || ''}
            onChange={(e) => updateTask({ input: { ...task.input, prompt: e.target.value } })}
            rows={4}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm font-mono"
            placeholder="The prompt to send to the agent"
          />
        </div>
      </div>

      {/* Graders */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Graders
          </h3>
          <button
            onClick={addGrader}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Add Grader
          </button>
        </div>

        <div className="space-y-4">
          {task.graders.map((grader, index) => {
            const graderType = GRADER_TYPES.find((g) => g.value === grader.type);
            return (
              <div
                key={index}
                className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Grader {index + 1}</span>
                  <button
                    onClick={() => removeGrader(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Type
                    </label>
                    <select
                      value={grader.type}
                      onChange={(e) => updateGrader(index, { type: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                    >
                      {GRADER_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {graderType?.requiresValue && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Expected Value
                      </label>
                      <input
                        type="text"
                        value={grader.value || ''}
                        onChange={(e) => updateGrader(index, { value: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                        placeholder={grader.type === 'regex' ? 'Regular expression' : 'Expected string'}
                      />
                    </div>
                  )}

                  {graderType?.hasThreshold && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Threshold (0-1)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={grader.threshold ?? 0.8}
                        onChange={(e) =>
                          updateGrader(index, { threshold: parseFloat(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                      />
                    </div>
                  )}

                  {graderType?.requiresRubric && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Rubric
                      </label>
                      <textarea
                        value={grader.rubric || ''}
                        onChange={(e) => updateGrader(index, { rubric: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                        placeholder="Describe the evaluation criteria for the LLM grader"
                      />
                    </div>
                  )}

                  {graderType?.requiresCommand && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Test Command
                      </label>
                      <input
                        type="text"
                        value={grader.command || ''}
                        onChange={(e) => updateGrader(index, { command: e.target.value })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm font-mono"
                        placeholder="e.g., npm test"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {task.graders.length === 0 && (
            <div className="text-center py-4 text-zinc-500 text-sm">
              No graders configured. Click &quot;Add Grader&quot; to add one.
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* YAML Preview */}
      <div className="mb-6">
        <button
          onClick={() => setShowYaml(!showYaml)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showYaml ? 'Hide' : 'Show'} YAML Preview
        </button>
        {showYaml && (
          <pre className="mt-2 p-4 bg-zinc-900 text-zinc-100 rounded-lg text-xs overflow-x-auto">
            {getYamlOutput()}
          </pre>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Task
        </button>
      </div>
    </div>
  );
}
