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

type Tab = 'overview' | 'deploy' | 'sync' | 'importexport' | 'logs' | 'settings';

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

  const adminPassword = 'password';
  const adminEmail = 'admin@example.com';
  const adminUsername = 'admin';

  useEffect(() => {
    fetch(`/api/sites/${slug}/info`)
      .then(r => r.json())
      .then(data => {
        if (data.wpVersion) setWpVersion(data.wpVersion);
        if (data.phpVersion) setPhpVersion(data.phpVersion);
      })
      .catch(() => {});
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
          <SettingsRow label="PHP" last>
            <span style={valueStyle} className="text-text">{phpVersion}</span>
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
