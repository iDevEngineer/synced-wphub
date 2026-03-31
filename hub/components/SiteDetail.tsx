'use client';

import useSWR from 'swr';
import { fetchSite, startSite, stopSite } from '@/lib/api';
import { ExternalLink, Eye, EyeOff, Folder, Code2, Paintbrush, AlignJustify, TerminalSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import DeployPanel from './DeployPanel';
import SyncPanel from './SyncPanel';
import SiteSettingsPanel from './SiteSettingsPanel';
import DeleteSiteModal from './DeleteSiteModal';
import ImportExportPanel from './ImportExportPanel';
import CopyButton from './CopyButton';
import EditSiteModal from './EditSiteModal';

type Tab = 'overview' | 'theme' | 'deploy' | 'sync' | 'importexport' | 'logs' | 'settings';

interface Props {
  slug: string;
  onStatusChange?: () => void;
  onDeleted?: () => void;
}

export default function SiteDetail({ slug, onStatusChange, onDeleted }: Props) {
  const { data: site, error, isLoading, mutate } = useSWR(
    slug ? `site-${slug}` : null,
    () => fetchSite(slug),
    { refreshInterval: 3000 }
  );

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  async function handleStart() {
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await startSite(slug);
      if (!result.success) {
        setActionError(result.error ?? 'Failed to start site.');
      } else {
        await mutate();
        onStatusChange?.();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start site.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStop() {
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await stopSite(slug);
      if (!result.success) {
        setActionError(result.error ?? 'Failed to stop site.');
      } else {
        await mutate();
        onStatusChange?.();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to stop site.');
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted">Loading...</span>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted">Failed to load site.</span>
      </div>
    );
  }

  const isRunning = site.status === 'running';
  const wpAdminUrl = site.url ? `${site.url}/wp-admin` : null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'theme', label: 'Theme' },
    { id: 'deploy', label: 'Deploy' },
    { id: 'sync', label: 'Sync' },
    { id: 'importexport', label: 'Import/Export' },
    { id: 'logs', label: 'Logs' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-0 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">
              {site.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: isRunning ? 'var(--color-accent)' : 'var(--color-stopped)' }}
              />
              <span className="text-sm text-muted">
                {isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>

          {/* Action buttons top-right */}
          <div className="flex items-center gap-2">
            {isRunning && site.url && (
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-border text-text"
              >
                <ExternalLink size={13} />
                Open site
              </a>
            )}
            {isRunning && wpAdminUrl && (
              <a
                href={wpAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-border text-text"
              >
                WP Admin
              </a>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 rounded text-sm font-medium bg-border text-text"
            >
              Edit site
            </button>
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50 bg-border text-text"
              >
                {actionLoading ? 'Stopping...' : 'Stop'}
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50 bg-accent text-white"
              >
                {actionLoading ? 'Starting...' : 'Start'}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <p className="text-sm mb-3 text-red-400">{actionError}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
              }}
            >
              <span className={activeTab === tab.id ? 'text-text' : 'text-muted'}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && (
          <OverviewTab
            site={site}
            isRunning={isRunning}
            wpAdminUrl={wpAdminUrl}
          />
        )}

        {activeTab === 'theme' && (
          <ThemeTab slug={site.slug} />
        )}

        {activeTab === 'deploy' && (
          <DeployPanel slug={slug} staging={site.staging} />
        )}

        {activeTab === 'sync' && (
          <SyncPanel slug={slug} staging={site.staging} />
        )}

        {activeTab === 'importexport' && (
          <ImportExportPanel slug={slug} />
        )}

        {activeTab === 'logs' && (
          <LogsTab slug={slug} isRunning={isRunning} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            slug={slug}
            site={site}
            isRunning={isRunning}
            wpAdminUrl={wpAdminUrl}
            onSaved={() => mutate()}
            onDeleteClick={() => setShowDeleteModal(true)}
          />
        )}
      </div>

      {showEditModal && (
        <EditSiteModal
          slug={slug}
          siteName={site.name}
          onClose={() => setShowEditModal(false)}
          onSaved={() => mutate()}
        />
      )}

      {showDeleteModal && (
        <DeleteSiteModal
          slug={slug}
          siteName={site.name}
          onDeleted={() => {
            setShowDeleteModal(false);
            onDeleted?.();
          }}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

interface OverviewTabProps {
  site: import('@/lib/api').SiteDetail;
  isRunning: boolean;
  wpAdminUrl: string | null;
}



function OverviewTab({ site, isRunning, wpAdminUrl }: OverviewTabProps) {
  const customizeUrl = site.url ? `${site.url}/wp-admin/customize.php` : null;
  const menusUrl = site.url ? `${site.url}/wp-admin/nav-menus.php` : null;

  const [editorLabel, setEditorLabel] = useState('Editor');
  const [terminalLabel, setTerminalLabel] = useState('Terminal');

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then(r => r.json()),
      fetch('/api/environment').then(r => r.json()),
    ]).then(([configData, envData]) => {
      const cfg = configData.config ?? configData;
      const editors: { id: string; label: string }[] = envData.editors ?? [];
      const terminals: { id: string; label: string }[] = envData.terminals ?? [];

      if (cfg.codeEditor) {
        const match = editors.find(e => e.id === cfg.codeEditor);
        setEditorLabel(match?.label ?? cfg.codeEditorApp ?? 'Editor');
      }
      if (cfg.terminal) {
        const match = terminals.find(t => t.id === cfg.terminal);
        setTerminalLabel(match?.label ?? cfg.terminalApp ?? 'Terminal');
      }
    }).catch(() => {});
  }, []);

  function openInFinder() {
    if (site.path) fetch(`/api/sites/${site.slug}/open-finder`, { method: 'POST' });
  }

  function openInEditor() {
    if (site.path) fetch(`/api/sites/${site.slug}/open-editor`, { method: 'POST' });
  }

  function openInTerminal() {
    if (site.path) fetch(`/api/sites/${site.slug}/open-terminal`, { method: 'POST' });
  }

  return (
    <div style={{ display: 'flex', gap: '40px' }}>
      {/* Left: Theme screenshot */}
      <div style={{ flexShrink: 0, width: '160px' }}>
        <div
          className="bg-card border border-border"
          style={{
            width: '160px',
            height: '200px',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          <img
            src={`/api/sites/${site.slug}/screenshot`}
            alt="Theme screenshot"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = 'none';
              const parent = el.parentElement;
              if (parent) {
                parent.style.display = 'flex';
                parent.style.alignItems = 'center';
                parent.style.justifyContent = 'center';
                parent.innerHTML = '<span style="font-size:12px;color:var(--color-stopped)">No preview</span>';
              }
            }}
          />
        </div>
        <p className="text-muted" style={{ fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
          Active theme
        </p>
      </div>

      {/* Right: Quick actions */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Customize section */}
        <section>
          <h2 className="text-muted" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
            Customize
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <QuickActionButton
              icon={<Paintbrush size={14} />}
              label="Customizer"
              href={isRunning && customizeUrl ? customizeUrl : undefined}
              disabled={!isRunning}
            />
            <QuickActionButton
              icon={<AlignJustify size={14} />}
              label="Menus"
              href={isRunning && menusUrl ? menusUrl : undefined}
              disabled={!isRunning}
            />
          </div>
        </section>

        {/* Open in... section */}
        <section>
          <h2 className="text-muted" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
            Open in...
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <QuickActionButton
              icon={<Folder size={14} />}
              label="Finder"
              onClick={openInFinder}
              disabled={!site.path}
            />
            <QuickActionButton
              icon={<Code2 size={14} />}
              label={editorLabel}
              onClick={openInEditor}
              disabled={!site.path}
            />
            <QuickActionButton
              icon={<TerminalSquare size={14} />}
              label={terminalLabel}
              onClick={openInTerminal}
              disabled={!site.path}
            />
          </div>
        </section>


      </div>
    </div>
  );
}

function ThemeTab({ slug }: { slug: string }) {
  const [colours, setColours] = useState<{ primary: string; secondary: string; accent: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [primary, setPrimary] = useState('#ffffff');
  const [secondary, setSecondary] = useState('#1a1a1a');
  const [accent, setAccent] = useState('#6366f1');
  const [saving, setSaving] = useState(false);
  const [themeName, setThemeName] = useState('');

  useEffect(() => {
    fetch(`/api/sites/${slug}/theme`)
      .then(r => r.json())
      .then(data => {
        if (data.colours) {
          setColours(data.colours);
          setPrimary(data.colours.primary);
          setSecondary(data.colours.secondary);
          setAccent(data.colours.accent);
        }
        if (data.themeName) setThemeName(data.themeName);
      })
      .catch(() => {});
  }, [slug]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/sites/${slug}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary, secondary, accent }),
      });
      setColours({ primary, secondary, accent });
      setEditing(false);
    } catch { /* ignore */ }
    setSaving(false);
  }

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '13px', fontWeight: 600, marginBottom: '12px',
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: '6px', overflow: 'hidden',
  };

  const swatchStyle = (colour: string): React.CSSProperties => ({
    width: '32px', height: '32px', borderRadius: '6px',
    backgroundColor: colour,
    border: '1px solid var(--color-border)',
    flexShrink: 0,
  });

  const colourRowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Brand colours */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 className="text-muted" style={sectionHeadingStyle}>
            Brand colours {themeName && <span style={{ fontWeight: 400 }}>— {themeName}</span>}
          </h2>
          {!editing && colours && (
            <button
              onClick={() => setEditing(true)}
              className="text-accent"
              style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Edit
            </button>
          )}
        </div>

        {!colours ? (
          <div className="bg-card border border-border" style={{ ...cardStyle, padding: '24px', textAlign: 'center' }}>
            <p className="text-muted" style={{ fontSize: '13px' }}>No custom theme found. Create a site with a Synced theme to edit colours.</p>
          </div>
        ) : editing ? (
          <div className="bg-card border border-border" style={cardStyle}>
            <div style={colourRowStyle}>
              <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} style={{ width: '32px', height: '32px', border: 'none', padding: 0, cursor: 'pointer' }} />
              <span className="text-text" style={{ fontSize: '13px', flex: 1 }}>Primary</span>
              <input type="text" value={primary} onChange={e => setPrimary(e.target.value)} className="text-text bg-surface border border-border" style={{ fontSize: '12px', fontFamily: 'monospace', width: '90px', padding: '6px 8px', borderRadius: '4px' }} />
            </div>
            <div style={colourRowStyle}>
              <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)} style={{ width: '32px', height: '32px', border: 'none', padding: 0, cursor: 'pointer' }} />
              <span className="text-text" style={{ fontSize: '13px', flex: 1 }}>Secondary</span>
              <input type="text" value={secondary} onChange={e => setSecondary(e.target.value)} className="text-text bg-surface border border-border" style={{ fontSize: '12px', fontFamily: 'monospace', width: '90px', padding: '6px 8px', borderRadius: '4px' }} />
            </div>
            <div style={{ ...colourRowStyle, borderBottom: 'none' }}>
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: '32px', height: '32px', border: 'none', padding: 0, cursor: 'pointer' }} />
              <span className="text-text" style={{ fontSize: '13px', flex: 1 }}>Accent</span>
              <input type="text" value={accent} onChange={e => setAccent(e.target.value)} className="text-text bg-surface border border-border" style={{ fontSize: '12px', fontFamily: 'monospace', width: '90px', padding: '6px 8px', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
              <button onClick={() => { setEditing(false); setPrimary(colours.primary); setSecondary(colours.secondary); setAccent(colours.accent); }} className="text-text bg-border" style={{ padding: '8px 16px', borderRadius: '4px', fontSize: '13px', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="text-white bg-accent" style={{ padding: '8px 16px', borderRadius: '4px', fontSize: '13px', border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border" style={cardStyle}>
            <div style={colourRowStyle}>
              <div style={swatchStyle(colours.primary)} />
              <span className="text-text" style={{ fontSize: '13px', flex: 1 }}>Primary</span>
              <span className="text-muted" style={{ fontSize: '12px', fontFamily: 'monospace' }}>{colours.primary}</span>
            </div>
            <div style={colourRowStyle}>
              <div style={swatchStyle(colours.secondary)} />
              <span className="text-text" style={{ fontSize: '13px', flex: 1 }}>Secondary</span>
              <span className="text-muted" style={{ fontSize: '12px', fontFamily: 'monospace' }}>{colours.secondary}</span>
            </div>
            <div style={{ ...colourRowStyle, borderBottom: 'none' }}>
              <div style={swatchStyle(colours.accent)} />
              <span className="text-text" style={{ fontSize: '13px', flex: 1 }}>Accent</span>
              <span className="text-muted" style={{ fontSize: '12px', fontFamily: 'monospace' }}>{colours.accent}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface InfoCardProps {
  label: string;
  value: string;
  isLink?: boolean;
  mono?: boolean;
  copyable?: boolean;
}

function InfoCard({ label, value, isLink, mono, copyable }: InfoCardProps) {
  return (
    <div className="bg-card border border-border" style={{ borderRadius: '8px', padding: '16px' }}>
      <p
        className="text-stopped"
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '8px',
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent"
            style={{
              fontSize: '14px',
              textDecoration: 'underline',
              fontFamily: mono ? 'monospace' : undefined,
              wordBreak: 'break-all',
            }}
          >
            {value}
          </a>
        ) : (
          <span
            className="text-text"
            style={{
              fontSize: '14px',
              fontFamily: mono ? 'monospace' : undefined,
              wordBreak: 'break-all',
            }}
          >
            {value}
          </span>
        )}
        {copyable && <CopyButton value={value} />}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

interface SettingsTabProps {
  slug: string;
  site: import('@/lib/api').SiteDetail;
  isRunning: boolean;
  wpAdminUrl: string | null;
  onSaved: () => void;
  onDeleteClick: () => void;
}

function SettingsTab({ slug, site, wpAdminUrl, onSaved, onDeleteClick }: SettingsTabProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(site.name);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [wpVersion, setWpVersion] = useState('—');
  const [phpVersion, setPhpVersion] = useState('—');
  const [debugStatus, setDebugStatus] = useState('Disabled');

  const adminPassword = 'password';
  const adminEmail = 'admin@example.com';
  const adminUsername = 'admin';

  useEffect(() => {
    Promise.all([
      fetch(`/api/sites/${slug}/info`).then(r => r.json()),
      fetch(`/api/sites/${slug}/config`).then(r => r.json()),
    ]).then(([infoData, configData]) => {
      if (infoData.wpVersion) setWpVersion(infoData.wpVersion);
      if (infoData.phpVersion) setPhpVersion(infoData.phpVersion);

      const parts: string[] = [];
      if (configData.wpDebug) parts.push('WP_DEBUG');
      if (configData.wpDebugLog) parts.push('Log');
      if (configData.wpDebugDisplay) parts.push('Display');
      setDebugStatus(parts.length > 0 ? parts.join(', ') : 'Disabled');
    }).catch(() => {});
  }, [slug]);

  async function handleNameSave() {
    if (!nameValue.trim() || nameValue.trim() === site.name) {
      setEditingName(false);
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      const res = await fetch(`/api/sites/${slug}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error ?? 'Failed to rename site.');
      }
      onSaved();
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to rename.');
    } finally {
      setNameSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '560px' }}>
      {/* Site information */}
      <section>
        <h2 style={sectionHeadingStyle} className="text-muted">Site information</h2>
        <div style={cardStyle} className="bg-card border border-border">
          {/* Site name — inline editable */}
          <SettingsRow label="Site name">
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditingName(false); setNameValue(site.name); } }}
                  className="bg-bg text-text border border-border"
                  style={{
                    flex: 1,
                    borderRadius: '5px',
                    padding: '4px 8px',
                    fontSize: '13px',
                  }}
                />
                <button
                  onClick={handleNameSave}
                  disabled={nameSaving}
                  className="bg-accent text-white"
                  style={{ ...smallButtonStyle }}
                >
                  {nameSaving ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameValue(site.name); }}
                  className="bg-border text-white"
                  style={{ ...smallButtonStyle }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={valueStyle} className="text-text">{site.name}</span>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-stopped"
                  style={{ fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                >
                  Edit
                </button>
              </div>
            )}
            {nameError && <span className="text-red-400" style={{ fontSize: '12px' }}>{nameError}</span>}
          </SettingsRow>

          {site.url && (
            <SettingsRow label="Local URL">
              <span style={valueStyle} className="text-text">{site.url}</span>
              <CopyButton value={site.url} />
            </SettingsRow>
          )}

          <SettingsRow label="Local path">
            <span className="text-text" style={{ ...valueStyle, fontFamily: 'monospace', fontSize: '12px' }}>{site.path ?? '—'}</span>
            {site.path && <CopyButton value={site.path} />}
          </SettingsRow>
          <SettingsRow label="WordPress">
            <span style={valueStyle} className="text-text">{wpVersion}</span>
          </SettingsRow>
          <SettingsRow label="PHP">
            <span style={valueStyle} className="text-text">{phpVersion}</span>
          </SettingsRow>
          <SettingsRow label="Debug mode" last>
            <span style={valueStyle} className="text-text">{debugStatus}</span>
          </SettingsRow>
        </div>
      </section>

      {/* WP Admin */}
      <section>
        <h2 style={sectionHeadingStyle} className="text-muted">WP Admin</h2>
        <div style={cardStyle} className="bg-card border border-border">
          {wpAdminUrl && (
            <SettingsRow label="Admin URL">
              <span style={valueStyle} className="text-text">{wpAdminUrl}</span>
              <CopyButton value={wpAdminUrl} />
            </SettingsRow>
          )}
          <SettingsRow label="Username">
            <span style={valueStyle} className="text-text">{adminUsername}</span>
            <CopyButton value={adminUsername} />
          </SettingsRow>
          <SettingsRow label="Password">
            <span style={valueStyle} className="text-text">
              {showPassword ? adminPassword : '••••••••'}
            </span>
            <button
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="text-stopped"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
            >
              {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <CopyButton value={adminPassword} />
          </SettingsRow>
          <SettingsRow label="Email" last>
            <span style={valueStyle} className="text-text">{adminEmail}</span>
            <CopyButton value={adminEmail} />
          </SettingsRow>
        </div>
      </section>

      {/* Staging configuration */}
      <section>
        <h2 style={sectionHeadingStyle} className="text-muted">Staging configuration</h2>
        <SiteSettingsPanel slug={slug} staging={site.staging} onSaved={onSaved} />
      </section>

      {/* Danger zone */}
      <section>
        <h2 style={sectionHeadingStyle} className="text-red-400">Danger zone</h2>
        <div
          className="bg-card border border-border"
          style={{
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p className="text-text" style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Delete site</p>
            <p className="text-muted" style={{ fontSize: '12px' }}>Permanently remove this site and optionally its files.</p>
          </div>
          <button
            onClick={onDeleteClick}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #ef4444',
              color: '#ef4444',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ef4444';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
            }}
          >
            Delete site
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '12px',
};

const cardStyle: React.CSSProperties = {
  borderRadius: '8px',
  overflow: 'hidden',
};

const valueStyle: React.CSSProperties = {
  fontSize: '13px',
  flex: 1,
  wordBreak: 'break-all',
};

const smallButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '4px',
  padding: '4px 10px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
};

// ─── Quick Action Button ─────────────────────────────────────────────────────

function QuickActionButton({
  icon,
  label,
  href,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const baseClass = `bg-card border border-border ${disabled ? 'text-stopped' : 'text-text'}`;
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'background-color 0.15s',
  };

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass} style={style}>
        {icon}{label}
      </a>
    );
  }

  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} className={baseClass} style={{ ...style, width: '100%' }}>
      {icon}{label}
    </button>
  );
}

// ─── Settings Row ─────────────────────────────────────────────────────────────

function SettingsRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span
        className="text-muted"
        style={{
          fontSize: '13px',
          width: '110px',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Logs Tab ─────────────────────────────────────────────── */

function LogsTab({ slug, isRunning }: { slug: string; isRunning: boolean }) {
  const [logs, setLogs] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          const res = await fetch(`/api/sites/${slug}/logs?tail=200`);
          const data = await res.json();
          if (!cancelled && data.logs) {
            setLogs(data.logs);
          }
        } catch { /* ignore */ }
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 className="text-text" style={{ fontSize: '14px', fontWeight: 600 }}>
          Site logs
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label className="text-muted" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            Auto-scroll
          </label>
          <button
            onClick={() => setLogs('')}
            className="text-muted hover:text-text"
            style={{ fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      </div>

      {!isRunning ? (
        <div
          className="bg-card border border-border text-muted"
          style={{
            flex: 1,
            borderRadius: '6px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
          }}
        >
          Start the site to see logs.
        </div>
      ) : (
        <div
          className="bg-card border border-border"
          style={{
            flex: 1,
            borderRadius: '6px',
            overflow: 'auto',
            padding: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '12px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {logs ? (
            <>
              <span className="text-text">{logs}</span>
              <div ref={logsEndRef} />
            </>
          ) : (
            <span className="text-muted">Waiting for logs...</span>
          )}
        </div>
      )}
    </div>
  );
}
