'use client';

/**
 * Settings Page (Task 50)
 * Configure default settings, API keys, and preferences
 */

import { useState, useEffect } from 'react';

interface Settings {
  defaultEndpoint: string;
  defaultTimeout: number;
  openaiApiKey: string;
  anthropicApiKey: string;
  defaultGraders: string[];
  theme: 'dark' | 'light';
}

const defaultSettings: Settings = {
  defaultEndpoint: '',
  defaultTimeout: 30000,
  openaiApiKey: '',
  anthropicApiKey: '',
  defaultGraders: ['contains'],
  theme: 'dark',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const stored = localStorage.getItem('agenteval-settings');
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch {
        console.error('Failed to parse settings');
      }
    }
  }, []);

  const handleSave = () => {
    // Save settings to localStorage (sensitive data should use env vars in production)
    localStorage.setItem('agenteval-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-zinc-500 mt-1">Configure your Agent Evals preferences</p>
        </div>

        {/* Saved notification */}
        {saved && (
          <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-600 text-emerald-400">
            Settings saved successfully
          </div>
        )}

        <div className="space-y-8">
          {/* Agent Defaults */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Agent Defaults</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Default Endpoint URL
                </label>
                <input
                  type="text"
                  value={settings.defaultEndpoint}
                  onChange={(e) => updateSetting('defaultEndpoint', e.target.value)}
                  placeholder="https://api.example.com/chat"
                  className="input"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Pre-fill this endpoint when creating new evaluations
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Default Timeout (ms)
                </label>
                <input
                  type="number"
                  value={settings.defaultTimeout}
                  onChange={(e) => updateSetting('defaultTimeout', parseInt(e.target.value) || 30000)}
                  className="input w-40"
                />
              </div>
            </div>
          </section>

          {/* API Keys */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">API Keys</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Required for LLM-based graders. Keys are stored locally in your browser.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={settings.openaiApiKey}
                  onChange={(e) => updateSetting('openaiApiKey', e.target.value)}
                  placeholder="sk-..."
                  className="input font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  value={settings.anthropicApiKey}
                  onChange={(e) => updateSetting('anthropicApiKey', e.target.value)}
                  placeholder="sk-ant-..."
                  className="input font-mono"
                />
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-900/20 border border-amber-600 text-amber-400 text-sm">
              <strong>Note:</strong> For production use, configure API keys via environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY) instead of storing them in the browser.
            </div>
          </section>

          {/* Default Graders */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Default Graders</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Select which graders to include by default in new evaluations
            </p>
            <div className="space-y-2">
              {[
                { value: 'contains', label: 'Contains String' },
                { value: 'exact', label: 'Exact Match' },
                { value: 'regex', label: 'Regex Pattern' },
                { value: 'llm-rubric', label: 'LLM Rubric' },
                { value: 'factuality', label: 'Factuality Check' },
                { value: 'similarity', label: 'Semantic Similarity' },
              ].map((grader) => (
                <label key={grader.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.defaultGraders.includes(grader.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateSetting('defaultGraders', [...settings.defaultGraders, grader.value]);
                      } else {
                        updateSetting('defaultGraders', settings.defaultGraders.filter((g) => g !== grader.value));
                      }
                    }}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-zinc-300">{grader.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Theme */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value as 'dark' | 'light')}
                className="input w-40"
              >
                <option value="dark">Dark (Default)</option>
                <option value="light" disabled>Light (Coming Soon)</option>
              </select>
            </div>
          </section>

          {/* Save Button */}
          <button onClick={handleSave} className="btn btn-primary w-full py-3">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
