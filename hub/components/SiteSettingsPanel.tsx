'use client';

import { useState } from 'react';
import type { StagingConfig } from '@/lib/api';

interface Props {
  slug: string;
  staging: StagingConfig | null;
  onSaved?: () => void;
}

const PROVIDERS = [
  { value: 'generic', label: 'Generic (SSH)' },
  { value: 'wpengine', label: 'WP Engine' },
  { value: 'kinsta', label: 'Kinsta' },
  { value: 'dokploy', label: 'Dokploy' },
];

export default function SiteSettingsPanel({ slug, staging, onSaved }: Props) {
  const [form, setForm] = useState({
    provider: staging?.provider ?? 'generic',
    sshHost: staging?.sshHost ?? '',
    sshUser: staging?.sshUser ?? '',
    wpPath: staging?.wpPath ?? '',
    stagingUrl: staging?.stagingUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/sites/${slug}/staging`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save.');
      }
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h2
        className="text-sm font-semibold mb-4"
        style={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        Staging configuration
      </h2>

      <div className="space-y-4">
        <Field label="Hosting provider">
          <select
            value={form.provider}
            onChange={(e) => handleChange('provider', e.target.value)}
            className="w-full px-3 py-2 rounded text-sm"
            style={{ backgroundColor: '#1a1d20', color: '#f9fafb', border: '1px solid #3d4147' }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Field>

        <Field label="SSH host">
          <input
            type="text"
            value={form.sshHost}
            onChange={(e) => handleChange('sshHost', e.target.value)}
            placeholder="staging.clientsite.com"
            className="w-full px-3 py-2 rounded text-sm"
            style={{ backgroundColor: '#1a1d20', color: '#f9fafb', border: '1px solid #3d4147' }}
          />
        </Field>

        <Field label="SSH user">
          <input
            type="text"
            value={form.sshUser}
            onChange={(e) => handleChange('sshUser', e.target.value)}
            placeholder="deploy"
            className="w-full px-3 py-2 rounded text-sm"
            style={{ backgroundColor: '#1a1d20', color: '#f9fafb', border: '1px solid #3d4147' }}
          />
        </Field>

        <Field label="WordPress path on staging">
          <input
            type="text"
            value={form.wpPath}
            onChange={(e) => handleChange('wpPath', e.target.value)}
            placeholder="/var/www/html"
            className="w-full px-3 py-2 rounded text-sm"
            style={{ backgroundColor: '#1a1d20', color: '#f9fafb', border: '1px solid #3d4147' }}
          />
        </Field>

        <Field label="Staging URL">
          <input
            type="text"
            value={form.stagingUrl}
            onChange={(e) => handleChange('stagingUrl', e.target.value)}
            placeholder="https://staging.clientsite.com"
            className="w-full px-3 py-2 rounded text-sm"
            style={{ backgroundColor: '#1a1d20', color: '#f9fafb', border: '1px solid #3d4147' }}
          />
        </Field>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#e05a2b', color: '#fff' }}
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
        {saved && (
          <span className="text-sm" style={{ color: '#34d399' }}>Settings saved.</span>
        )}
        {error && (
          <span className="text-sm" style={{ color: '#f87171' }}>{error}</span>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: '#9ca3af' }}>{label}</label>
      {children}
    </div>
  );
}
