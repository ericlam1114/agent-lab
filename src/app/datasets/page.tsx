'use client';

/**
 * Datasets Page (Task 48)
 * Manage evaluation datasets with test cases
 */

import { useState, useEffect } from 'react';

interface Dataset {
  id: string;
  name: string;
  description: string;
  variables: string[];
  rows: Array<Record<string, string>>;
  createdAt: string;
}

function CreateDatasetModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataset: { name: string; description: string; variables: string[]; rows: Array<Record<string, string>> }) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [variablesInput, setVariablesInput] = useState('');
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);

  if (!isOpen) return null;

  const variables = variablesInput.split(',').map(v => v.trim()).filter(Boolean);

  const addRow = () => {
    const newRow: Record<string, string> = {};
    variables.forEach(v => { newRow[v] = ''; });
    setRows([...rows, newRow]);
  };

  const updateRow = (index: number, variable: string, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [variable]: value };
    setRows(newRows);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({ name, description, variables, rows });
    setName('');
    setDescription('');
    setVariablesInput('');
    setRows([]);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-white">Create Dataset</h2>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer Scenarios"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this dataset..."
              rows={2}
              className="input resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Variables (comma-separated)
            </label>
            <input
              type="text"
              value={variablesInput}
              onChange={(e) => setVariablesInput(e.target.value)}
              placeholder="e.g., name, question, context"
              className="input font-mono"
            />
          </div>

          {variables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Data Rows</label>
              <div className="space-y-2">
                {rows.map((row, index) => (
                  <div key={index} className="card p-3 flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      {variables.map(v => (
                        <input
                          key={v}
                          type="text"
                          value={row[v] || ''}
                          onChange={(e) => updateRow(index, v, e.target.value)}
                          placeholder={v}
                          className="input text-sm"
                        />
                      ))}
                    </div>
                    <button onClick={() => removeRow(index)} className="text-red-500 hover:text-red-400 p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button onClick={addRow} className="btn btn-secondary w-full text-sm">
                  Add Row
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={!name} className="btn btn-primary disabled:opacity-50">
            Create Dataset
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      const response = await fetch('/api/datasets');
      const data = await response.json();
      setDatasets(data.datasets || []);
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDataset = async (dataset: { name: string; description: string; variables: string[]; rows: Array<Record<string, string>> }) => {
    try {
      await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataset),
      });
      fetchDatasets();
    } catch (error) {
      console.error('Failed to create dataset:', error);
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
            <h1 className="text-2xl font-bold text-white">Datasets</h1>
            <p className="text-zinc-500 mt-1">Manage your evaluation test cases</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Dataset
          </button>
        </div>

        {/* Datasets Grid or Empty State */}
        {datasets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-16 h-16 mx-auto text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M4 12h16" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No datasets yet</h3>
            <p className="text-zinc-500 mb-6">Create a dataset to define test variables and values</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              Create Your First Dataset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => (
              <div key={dataset.id} className="card p-6 hover:border-blue-600 transition-colors cursor-pointer">
                <h3 className="text-lg font-semibold text-white mb-2">{dataset.name}</h3>
                {dataset.description && (
                  <p className="text-sm text-zinc-400 mb-4">{dataset.description}</p>
                )}
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Variables:</span>
                    <span className="text-white ml-1 data-value">{dataset.variables.length}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Rows:</span>
                    <span className="text-white ml-1 data-value">{dataset.rows.length}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {dataset.variables.slice(0, 3).map((v) => (
                    <span key={v} className="badge badge-info text-xs">{v}</span>
                  ))}
                  {dataset.variables.length > 3 && (
                    <span className="badge badge-info text-xs">+{dataset.variables.length - 3}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateDatasetModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateDataset}
        />
      </div>
    </div>
  );
}
