'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SiteConfig {
  phpVersion: string | null;
  wpVersion: string | null;
  wpDebug: boolean;
  wpDebugLog: boolean;
  wpDebugDisplay: boolean;
}

interface Props {
  slug: string;
  siteName: string;
  onClose: () => void;
  onSaved: () => void;
}

const PHP_VERSIONS = ['7.0', '7.1', '7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3'];
const WP_VERSIONS = ['6.0', '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7'];

type Tab = 'general' | 'debugging';

export default function EditSiteModal({ slug, siteName, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General
  const [name, setName] = useState(siteName);
  const [phpVersion, setPhpVersion] = useState<string>('');
  const [wpVersion, setWpVersion] = useState<string>('');

  // Debugging
  const [wpDebug, setWpDebug] = useState(false);
  const [wpDebugLog, setWpDebugLog] = useState(false);
  const [wpDebugDisplay, setWpDebugDisplay] = useState(false);

  useEffect(() => {
    fetch(`/api/sites/${slug}/config`)
      .then(r => r.json())
      .then((data: SiteConfig) => {
        if (data.phpVersion) setPhpVersion(data.phpVersion);
        if (data.wpVersion) setWpVersion(data.wpVersion);
        setWpDebug(data.wpDebug ?? false);
        setWpDebugLog(data.wpDebugLog ?? false);
        setWpDebugDisplay(data.wpDebugDisplay ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/sites/${slug}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || siteName,
          phpVersion: phpVersion || null,
          wpVersion: wpVersion || null,
          wpDebug,
          wpDebugLog,
          wpDebugDisplay,
        }),
      });
      onSaved();
      onClose();
    } catch {
      setSaving(false);
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const modalStyle: React.CSSProperties = {
    width: '480px', maxHeight: '90vh', minHeight: '500px', borderRadius: '8px',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '4px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)', fontSize: '13px',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, appearance: 'auto' as const,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        className="bg-card border border-border"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-text" style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Edit site
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 20px' }}>
          {(['general', 'debugging'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? 'text-text' : 'text-muted'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: '13px', fontWeight: 500,
                borderBottom: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {t === 'general' ? 'General' : 'Debugging'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading ? (
            <p className="text-muted" style={{ fontSize: '13px' }}>Loading...</p>
          ) : tab === 'general' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-text" style={labelStyle}>Site name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-text" style={labelStyle}>PHP version</label>
                <select
                  value={phpVersion}
                  onChange={(e) => setPhpVersion(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Default (latest)</option>
                  {PHP_VERSIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                  Changing PHP version requires a site restart.
                </p>
              </div>
              <div>
                <label className="text-text" style={labelStyle}>WordPress version</label>
                <select
                  value={wpVersion}
                  onChange={(e) => setWpVersion(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Default (latest)</option>
                  {WP_VERSIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                  Changing WordPress version requires a site restart.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <CheckboxRow
                checked={wpDebug}
                onChange={setWpDebug}
                label="Enable debug mode"
                description="Sets WP_DEBUG to true. WordPress will report all PHP notices and warnings."
              />
              <CheckboxRow
                checked={wpDebugLog}
                onChange={(v) => { setWpDebugLog(v); if (v) setWpDebug(true); }}
                label="Enable debug log"
                description="Sets WP_DEBUG_LOG to true. Errors are saved to wp-content/debug.log."
              />
              <CheckboxRow
                checked={wpDebugDisplay}
                onChange={(v) => { setWpDebugDisplay(v); if (v) setWpDebug(true); }}
                label="Show errors in browser"
                description="Sets WP_DEBUG_DISPLAY to true. PHP errors will be shown on-screen. Not recommended for staging or production."
              />
              <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                Debug settings require a site restart to take effect.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={onClose}
            className="text-text bg-border"
            style={{ padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-white bg-accent"
            style={{ padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckboxRow({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: 'var(--color-accent)', marginTop: '2px', flexShrink: 0 }}
      />
      <div>
        <span className="text-text" style={{ fontSize: '13px', fontWeight: 500, display: 'block' }}>
          {label}
        </span>
        <span className="text-muted" style={{ fontSize: '12px', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>
          {description}
        </span>
      </div>
    </label>
  );
}
