'use client';

/**
 * New Eval Wizard Page (Task 43)
 * 5-step wizard for creating new evaluations
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface AgentConfig {
  type: 'http' | 'websocket' | 'custom';
  endpoint: string;
  headers: Record<string, string>;
  timeout: number;
}

interface TaskConfig {
  id: string;
  description: string;
  input: string;
  variables: Record<string, string>;
}

interface GraderConfig {
  type: 'contains' | 'exact' | 'regex' | 'llm-rubric' | 'factuality' | 'similarity';
  value?: string;
  rubric?: string;
  threshold?: number;
}

interface EvalConfig {
  name: string;
  description: string;
  agent: AgentConfig;
  tasks: TaskConfig[];
  graders: GraderConfig[];
}

// Step indicator component
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`w-10 h-10 flex items-center justify-center font-bold text-sm ${
              index < currentStep
                ? 'bg-emerald-600 text-white'
                : index === currentStep
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-500 border border-[var(--border)]'
            }`}
          >
            {index < currentStep ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          <div
            className={`hidden sm:block text-xs ml-2 mr-4 ${
              index === currentStep ? 'text-white font-medium' : 'text-zinc-500'
            }`}
          >
            {step}
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 ${index < currentStep ? 'bg-emerald-600' : 'bg-zinc-700'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// Step 1: Basic Info
function Step1BasicInfo({
  config,
  onChange,
}: {
  config: EvalConfig;
  onChange: (updates: Partial<EvalConfig>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Basic Information</h2>
        <p className="text-zinc-400">Give your evaluation a name and description.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Evaluation Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g., Customer Support Agent v2"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Description
          </label>
          <textarea
            value={config.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Describe what this evaluation tests..."
            rows={3}
            className="input resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// Step 2: Agent Configuration
function Step2AgentConfig({
  config,
  onChange,
}: {
  config: EvalConfig;
  onChange: (updates: Partial<EvalConfig>) => void;
}) {
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      onChange({
        agent: {
          ...config.agent,
          headers: { ...config.agent.headers, [newHeaderKey]: newHeaderValue },
        },
      });
      setNewHeaderKey('');
      setNewHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...config.agent.headers };
    delete newHeaders[key];
    onChange({ agent: { ...config.agent, headers: newHeaders } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Agent Configuration</h2>
        <p className="text-zinc-400">Configure how to connect to your AI agent.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Agent Type
          </label>
          <select
            value={config.agent.type}
            onChange={(e) =>
              onChange({ agent: { ...config.agent, type: e.target.value as AgentConfig['type'] } })
            }
            className="input"
          >
            <option value="http">HTTP API</option>
            <option value="websocket">WebSocket</option>
            <option value="custom">Custom Provider</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Endpoint URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.agent.endpoint}
            onChange={(e) => onChange({ agent: { ...config.agent, endpoint: e.target.value } })}
            placeholder="https://api.example.com/chat"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Timeout (ms)
          </label>
          <input
            type="number"
            value={config.agent.timeout}
            onChange={(e) =>
              onChange({ agent: { ...config.agent, timeout: parseInt(e.target.value) || 30000 } })
            }
            className="input w-32"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Headers</label>
          <div className="space-y-2">
            {Object.entries(config.agent.headers).map(([key, value]) => (
              <div key={key} className="flex gap-2 items-center">
                <code className="flex-1 text-sm px-3 py-2 bg-zinc-900 text-zinc-300 border border-[var(--border)]">
                  {key}: {value.startsWith('sk-') ? '****' : value}
                </code>
                <button
                  onClick={() => removeHeader(key)}
                  className="text-red-500 hover:text-red-400 p-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newHeaderKey}
                onChange={(e) => setNewHeaderKey(e.target.value)}
                placeholder="Header name"
                className="input flex-1"
              />
              <input
                type="text"
                value={newHeaderValue}
                onChange={(e) => setNewHeaderValue(e.target.value)}
                placeholder="Header value"
                className="input flex-1"
              />
              <button onClick={addHeader} className="btn btn-secondary px-3">
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Tasks
function Step3Tasks({
  config,
  onChange,
}: {
  config: EvalConfig;
  onChange: (updates: Partial<EvalConfig>) => void;
}) {
  const addTask = () => {
    const newTask: TaskConfig = {
      id: `task-${Date.now()}`,
      description: '',
      input: '',
      variables: {},
    };
    onChange({ tasks: [...config.tasks, newTask] });
  };

  const updateTask = (index: number, updates: Partial<TaskConfig>) => {
    const newTasks = [...config.tasks];
    newTasks[index] = { ...newTasks[index], ...updates };
    onChange({ tasks: newTasks });
  };

  const removeTask = (index: number) => {
    onChange({ tasks: config.tasks.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Test Cases</h2>
        <p className="text-zinc-400">Define the prompts and inputs to test your agent with.</p>
      </div>

      <div className="space-y-4">
        {config.tasks.map((task, index) => (
          <div key={task.id} className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-400">Task {index + 1}</span>
              <button
                onClick={() => removeTask(index)}
                className="text-red-500 hover:text-red-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={task.description}
                onChange={(e) => updateTask(index, { description: e.target.value })}
                placeholder="e.g., Test greeting response"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Prompt / Input
              </label>
              <textarea
                value={task.input}
                onChange={(e) => updateTask(index, { input: e.target.value })}
                placeholder="Enter the prompt to send to the agent..."
                rows={3}
                className="input resize-none font-mono text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Use {'{{variable}}'} syntax for dynamic values
              </p>
            </div>
          </div>
        ))}

        <button onClick={addTask} className="btn btn-secondary w-full flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Test Case
        </button>
      </div>
    </div>
  );
}

// Step 4: Graders
function Step4Graders({
  config,
  onChange,
}: {
  config: EvalConfig;
  onChange: (updates: Partial<EvalConfig>) => void;
}) {
  const graderTypes = [
    { value: 'contains', label: 'Contains String', description: 'Check if output contains text' },
    { value: 'exact', label: 'Exact Match', description: 'Exact string match' },
    { value: 'regex', label: 'Regex Pattern', description: 'Match against regex' },
    { value: 'llm-rubric', label: 'LLM Rubric', description: 'AI-powered evaluation with custom rubric' },
    { value: 'factuality', label: 'Factuality', description: 'Check factual accuracy' },
    { value: 'similarity', label: 'Semantic Similarity', description: 'Compare semantic meaning' },
  ];

  const addGrader = () => {
    const newGrader: GraderConfig = {
      type: 'contains',
      value: '',
    };
    onChange({ graders: [...config.graders, newGrader] });
  };

  const updateGrader = (index: number, updates: Partial<GraderConfig>) => {
    const newGraders = [...config.graders];
    newGraders[index] = { ...newGraders[index], ...updates };
    onChange({ graders: newGraders });
  };

  const removeGrader = (index: number) => {
    onChange({ graders: config.graders.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Graders</h2>
        <p className="text-zinc-400">Choose how to evaluate your agent&apos;s responses.</p>
      </div>

      <div className="space-y-4">
        {config.graders.map((grader, index) => (
          <div key={index} className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-400">Grader {index + 1}</span>
              <button
                onClick={() => removeGrader(index)}
                className="text-red-500 hover:text-red-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Type</label>
              <select
                value={grader.type}
                onChange={(e) => updateGrader(index, { type: e.target.value as GraderConfig['type'] })}
                className="input"
              >
                {graderTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {['contains', 'exact', 'regex'].includes(grader.type) && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  {grader.type === 'regex' ? 'Pattern' : 'Expected Value'}
                </label>
                <input
                  type="text"
                  value={grader.value || ''}
                  onChange={(e) => updateGrader(index, { value: e.target.value })}
                  placeholder={grader.type === 'regex' ? '/pattern/i' : 'Expected text...'}
                  className="input font-mono"
                />
              </div>
            )}

            {grader.type === 'llm-rubric' && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Rubric</label>
                <textarea
                  value={grader.rubric || ''}
                  onChange={(e) => updateGrader(index, { rubric: e.target.value })}
                  placeholder="Describe the evaluation criteria..."
                  rows={4}
                  className="input resize-none"
                />
              </div>
            )}

            {grader.type === 'similarity' && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Similarity Threshold (0-1)
                </label>
                <input
                  type="number"
                  value={grader.threshold || 0.8}
                  onChange={(e) => updateGrader(index, { threshold: parseFloat(e.target.value) })}
                  min="0"
                  max="1"
                  step="0.1"
                  className="input w-32"
                />
              </div>
            )}
          </div>
        ))}

        <button onClick={addGrader} className="btn btn-secondary w-full flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Grader
        </button>
      </div>
    </div>
  );
}

// Step 5: Review & Run
function Step5Review({
  config,
  onRun,
  isRunning,
}: {
  config: EvalConfig;
  onRun: () => void;
  isRunning: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Review & Run</h2>
        <p className="text-zinc-400">Review your evaluation configuration before running.</p>
      </div>

      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Evaluation
          </h3>
          <p className="text-lg font-bold text-white">{config.name || 'Untitled'}</p>
          {config.description && (
            <p className="text-sm text-zinc-400 mt-1">{config.description}</p>
          )}
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Agent
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Type:</span>
              <span className="text-white font-mono">{config.agent.type.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Endpoint:</span>
              <span className="text-white font-mono truncate max-w-xs">{config.agent.endpoint || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Timeout:</span>
              <span className="text-white font-mono">{config.agent.timeout}ms</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Test Cases
            </h3>
            <p className="text-3xl font-bold text-white data-value">{config.tasks.length}</p>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Graders
            </h3>
            <p className="text-3xl font-bold text-white data-value">{config.graders.length}</p>
          </div>
        </div>

        {/* YAML Preview */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Configuration Preview
          </h3>
          <pre className="code-block text-xs overflow-auto max-h-64">
{`name: ${config.name || 'untitled'}
description: ${config.description || ''}
agent:
  type: ${config.agent.type}
  endpoint: ${config.agent.endpoint}
  timeout: ${config.agent.timeout}
tasks:
${config.tasks.map((t, i) => `  - description: ${t.description || `Task ${i + 1}`}
    input: "${t.input.replace(/"/g, '\\"')}"`).join('\n') || '  []'}
graders:
${config.graders.map((g) => `  - type: ${g.type}${g.value ? `\n    value: "${g.value}"` : ''}${g.rubric ? `\n    rubric: "${g.rubric}"` : ''}`).join('\n') || '  []'}`}
          </pre>
        </div>

        {/* Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning || !config.name || !config.agent.endpoint || config.tasks.length === 0}
          className="btn btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Evaluation...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Create & Run Evaluation
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Main Wizard Component
export default function NewEvalWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<EvalConfig>({
    name: '',
    description: '',
    agent: {
      type: 'http',
      endpoint: '',
      headers: {},
      timeout: 30000,
    },
    tasks: [],
    graders: [],
  });

  const steps = ['Basic Info', 'Agent', 'Tasks', 'Graders', 'Review'];

  const updateConfig = (updates: Partial<EvalConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return config.name.trim().length > 0;
      case 1:
        return config.agent.endpoint.trim().length > 0;
      case 2:
        return config.tasks.length > 0;
      case 3:
        return true; // Graders are optional
      default:
        return true;
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch('/api/evals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create evaluation');
      }

      const data = await response.json();
      router.push(`/evals/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create evaluation');
      setIsRunning(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <Step1BasicInfo config={config} onChange={updateConfig} />;
      case 1:
        return <Step2AgentConfig config={config} onChange={updateConfig} />;
      case 2:
        return <Step3Tasks config={config} onChange={updateConfig} />;
      case 3:
        return <Step4Graders config={config} onChange={updateConfig} />;
      case 4:
        return <Step5Review config={config} onRun={handleRun} isRunning={isRunning} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Create New Evaluation</h1>
          <p className="text-zinc-500 mt-1">Set up a new agent evaluation in 5 easy steps</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} steps={steps} />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 text-red-400">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="card p-6 mb-6">{renderStep()}</div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {currentStep < steps.length - 1 && (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={!canProceed()}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
