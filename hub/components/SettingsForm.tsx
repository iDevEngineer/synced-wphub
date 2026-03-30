'use client';

import { useState, useEffect } from 'react';
import { fetchConfig, saveConfig, type Config } from '@/lib/api';

const PROVIDERS = [
  { value: 'generic', label: 'Generic' },
  { value: 'wpengine', label: 'WP Engine' },
  { value: 'kinsta', label: 'Kinsta' },
  { value: 'dokploy', label: 'Dokploy' },
];

export default function SettingsForm() {
  const [config, setConfig] = useState<Config>({
    sitesPath: '',
    wpCliPath: '',
    github: '',
    defaultProvider: 'generic',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig()
      .then((cfg) => {
        setConfig({
          sitesPath: cfg.sitesPath ?? '',
          wpCliPath: cfg.wpCliPath ?? '',
          github: cfg.github ?? '',
          defaultProvider: cfg.defaultProvider ?? 'generic',
        });
      })
      .catch(() => {
        // Config may not exist yet — that's fine
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm" style={{ color: '#9ca3af' }}>
        Loading settings...
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Local environment */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#9ca3af' }}>
          Local environment
        </h2>
        <div className="space-y-4">
          <Field
            label="Sites path"
            value={config.sitesPath ?? ''}
            onChange={(v) => setConfig({ ...config, sitesPath: v })}
            placeholder="~/Synced-Sites"
          />
          <Field
            label="WP-CLI path"
            value={config.wpCliPath ?? ''}
            onChange={(v) => setConfig({ ...config, wpCliPath: v })}
            placeholder="/usr/local/bin/wp"
          />
        </div>
      </section>

      <div className="border-t" style={{ borderColor: '#3d4147' }} />

      {/* Section 2: Git and GitHub */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#9ca3af' }}>
          Git and GitHub
        </h2>
        <Field
          label="GitHub username or organisation"
          value={config.github ?? ''}
          onChange={(v) => setConfig({ ...config, github: v })}
          placeholder="your-username"
        />
      </section>

      <div className="border-t" style={{ borderColor: '#3d4147' }} />

      {/* Section 3: Defaults */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#9ca3af' }}>
          Defaults
        </h2>
        <div>
          <label className="block text-sm mb-1" style={{ color: '#f9fafb' }}>
            Default hosting provider
          </label>
          <select
            value={config.defaultProvider ?? 'generic'}
            onChange={(e) => setConfig({ ...config, defaultProvider: e.target.value })}
            className="w-full px-3 py-2 rounded text-sm border"
            style={{
              backgroundColor: '#2b2f33',
              borderColor: '#3d4147',
              color: '#f9fafb',
            }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#e05a2b', color: '#fff' }}
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
        {saved && (
          <span className="text-sm" style={{ color: '#34d399' }}>
            Settings saved.
          </span>
        )}
        {error && (
          <span className="text-sm" style={{ color: '#f87171' }}>
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1" style={{ color: '#f9fafb' }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded text-sm border"
        style={{
          backgroundColor: '#2b2f33',
          borderColor: '#3d4147',
          color: '#f9fafb',
        }}
      />
    </div>
  );
}
