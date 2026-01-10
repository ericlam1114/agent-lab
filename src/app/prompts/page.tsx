'use client';

/**
 * Prompts Page (Task 49)
 * Manage prompt templates with variables
 */

import { useState, useEffect } from 'react';

interface Prompt {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  createdAt: string;
}

function CreatePromptModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: { name: string; description: string; template: string }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('');

  if (!isOpen) return null;

  // Extract variables from template
  const variables = [...new Set((template.match(/\{\{(\w+)\}\}/g) || []).map(m => m.slice(2, -2)))];

  const handleSave = () => {
    onSave({ name, description, template });
    setName('');
    setDescription('');
    setTemplate('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-white">Create Prompt Template</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer Support Base"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this prompt template..."
              rows={2}
              className="input resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Template
              <span className="text-zinc-500 ml-2 font-normal">Use {'{{variable}}'} syntax</span>
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder={`You are a helpful {{role}}.\n\nUser Query: {{query}}\n\nPlease respond appropriately.`}
              rows={8}
              className="input resize-none font-mono text-sm"
            />
          </div>
          {variables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Detected Variables</label>
              <div className="flex flex-wrap gap-2">
                {variables.map((v) => (
                  <span key={v} className="badge badge-info">{v}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!name || !template}
            className="btn btn-primary disabled:opacity-50"
          >
            Create Template
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrompt = async (prompt: { name: string; description: string; template: string }) => {
    try {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
      });
      fetchPrompts();
    } catch (error) {
      console.error('Failed to create prompt:', error);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Prompt Templates</h1>
            <p className="text-zinc-500 mt-1">Reusable prompts with variable placeholders</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Template
          </button>
        </div>

        {/* Prompts Grid or Empty State */}
        {prompts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-16 h-16 mx-auto text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No prompt templates yet</h3>
            <p className="text-zinc-500 mb-6">Create templates with variables for reusable prompts</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="card p-6 hover:border-blue-600 transition-colors cursor-pointer">
                <h3 className="text-lg font-semibold text-white mb-2">{prompt.name}</h3>
                {prompt.description && (
                  <p className="text-sm text-zinc-400 mb-4">{prompt.description}</p>
                )}
                <pre className="code-block text-xs max-h-32 overflow-hidden mb-4">
                  {prompt.template.substring(0, 200)}{prompt.template.length > 200 ? '...' : ''}
                </pre>
                <div className="flex flex-wrap gap-1">
                  {prompt.variables.map((v) => (
                    <span key={v} className="badge badge-info text-xs">{`{{${v}}}`}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <CreatePromptModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreatePrompt}
        />
      </div>
    </div>
  );
}
