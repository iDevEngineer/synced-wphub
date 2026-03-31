'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { DetectedApp } from '@/app/api/environment/route';
import type { Config } from '@/lib/api';

interface EnvironmentData {
  editors: DetectedApp[];
  terminals: DetectedApp[];
}

interface Props {
  onClose: () => void;
}

type Theme = 'dark' | 'light' | 'system';

export default function SettingsModal({ onClose }: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [env, setEnv] = useState<EnvironmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state — only committed on Save
  const [theme, setTheme] = useState<Theme>('dark');
  const [codeEditor, setCodeEditor] = useState('');
  const [terminal, setTerminal] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [configRes, envRes] = await Promise.all([
          fetch('/api/config'),
          fetch('/api/environment'),
        ]);
        const configData = await configRes.json();
        const envData = await envRes.json();

        const cfg: Config = configData.config ?? {};
        setConfig(cfg);
        setTheme((cfg.theme as Theme) ?? 'dark');
        setCodeEditor(cfg.codeEditor ?? '');
        setTerminal(cfg.terminal ?? '');
        setEnv(envData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Save theme immediately when card clicked
  const handleThemeSelect = useCallback(async (t: Theme) => {
    setTheme(t);
    if (!config) return;
    const updated = { ...config, theme: t };
    setConfig(updated);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      // Apply theme class to body immediately
      applyTheme(t);
    } catch {
      // non-fatal, theme still reflects locally
    }
  }, [config]);

  // Save editor immediately on change
  const handleEditorChange = useCallback(async (editorId: string) => {
    setCodeEditor(editorId);
    if (!config) return;
    const detected = env?.editors.find(e => e.id === editorId);
    const updated = { ...config, codeEditor: editorId, codeEditorApp: detected?.appName ?? editorId };
    setConfig(updated);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      // non-fatal
    }
  }, [config, env]);

  // Save terminal immediately on change
  const handleTerminalChange = useCallback(async (termId: string) => {
    setTerminal(termId);
    if (!config) return;
    const detected = env?.terminals.find(t => t.id === termId);
    const updated = { ...config, terminal: termId, terminalApp: detected?.appName ?? termId };
    setConfig(updated);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      // non-fatal
    }
  }, [config]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const updated: Config = { ...config, theme, codeEditor, terminal };
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error ?? 'Failed to save');
      }
      applyTheme(theme);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70"
      style={{ zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-surface border border-border"
        style={{
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          className="border-b border-border"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
          }}
        >
          <h2 className="text-text" style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-muted"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            <p className="text-muted" style={{ fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>
              Loading…
            </p>
          ) : (
            <>
              {/* Appearance section */}
              <section style={{ marginBottom: '32px' }}>
                <h3 style={sectionHeadingStyle} className="text-stopped">Appearance</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <ThemeCard
                    id="system"
                    label="System"
                    selected={theme === 'system'}
                    onSelect={handleThemeSelect}
                    preview={<SystemPreview />}
                  />
                  <ThemeCard
                    id="light"
                    label="Light"
                    selected={theme === 'light'}
                    onSelect={handleThemeSelect}
                    preview={<LightPreview />}
                  />
                  <ThemeCard
                    id="dark"
                    label="Dark"
                    selected={theme === 'dark'}
                    onSelect={handleThemeSelect}
                    preview={<DarkPreview />}
                  />
                </div>
              </section>

              {/* Tools section */}
              <section style={{ marginBottom: '24px' }}>
                <h3 style={sectionHeadingStyle} className="text-stopped">Tools</h3>
                <div className="bg-card border border-border" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                  {/* Code editor */}
                  <div
                    className="border-b border-border"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 16px',
                      gap: '16px',
                    }}
                  >
                    <label className="text-muted" style={{ fontSize: '13px', width: '130px', flexShrink: 0 }}>
                      Code editor
                    </label>
                    <AppDropdown
                      value={codeEditor}
                      onChange={handleEditorChange}
                      options={env?.editors ?? []}
                      placeholder="Select editor…"
                    />
                  </div>

                  {/* Terminal */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 16px',
                      gap: '16px',
                    }}
                  >
                    <label className="text-muted" style={{ fontSize: '13px', width: '130px', flexShrink: 0 }}>
                      Terminal application
                    </label>
                    <AppDropdown
                      value={terminal}
                      onChange={handleTerminalChange}
                      options={env?.terminals ?? []}
                      placeholder="Select terminal…"
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          {error && (
            <p className="text-red-400" style={{ fontSize: '13px', marginBottom: '16px' }}>{error}</p>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={onClose}
              className="text-muted border border-border"
              style={{
                backgroundColor: 'transparent',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-accent text-white"
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                opacity: saving || loading ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Theme Cards ─────────────────────────────────────────────────────────────

function ThemeCard({
  id,
  label,
  selected,
  onSelect,
  preview,
}: {
  id: Theme;
  label: string;
  selected: boolean;
  onSelect: (t: Theme) => void;
  preview: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onSelect(id)}
      className="bg-bg"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        border: `2px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      {preview}
      <span className={selected ? 'text-text' : 'text-muted'} style={{ fontSize: '12px', fontWeight: selected ? 600 : 400 }}>
        {label}
      </span>
    </button>
  );
}

function SystemPreview() {
  return (
    <div
      style={{
        width: '100%',
        height: '56px',
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <div className="bg-bg" style={{ flex: 1 }} />
      <div style={{ flex: 1, backgroundColor: 'var(--color-border)' }} />
    </div>
  );
}

function LightPreview() {
  return (
    <div
      style={{
        width: '100%',
        height: '56px',
        borderRadius: '4px',
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    />
  );
}

function DarkPreview() {
  return (
    <div
      className="bg-bg"
      style={{
        width: '100%',
        height: '56px',
        borderRadius: '4px',
      }}
    />
  );
}

// ─── App Dropdown ─────────────────────────────────────────────────────────────

function AppDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: DetectedApp[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-bg text-text border border-border"
      style={{
        flex: 1,
        borderRadius: '6px',
        padding: '7px 10px',
        fontSize: '13px',
        cursor: 'pointer',
        appearance: 'auto',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option
          key={opt.id}
          value={opt.id}
          disabled={!opt.available}
          className={opt.available ? 'text-text' : 'text-stopped'}
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          {opt.available ? opt.label : `${opt.label} (not installed)`}
        </option>
      ))}
    </select>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  // Notify ThemeApplier and any other listeners
  window.dispatchEvent(new CustomEvent('synced:theme-change', { detail: theme }));
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '12px',
  marginTop: 0,
};
