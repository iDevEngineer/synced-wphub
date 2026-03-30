'use client';

import useSWR from 'swr';
import { fetchSite, startSite, stopSite } from '@/lib/api';
import { ExternalLink, Eye, EyeOff, Folder, Code2, Paintbrush, AlignJustify } from 'lucide-react';
import { useState } from 'react';
import DeployPanel from './DeployPanel';
import SyncPanel from './SyncPanel';
import SiteSettingsPanel from './SiteSettingsPanel';
import DeleteSiteModal from './DeleteSiteModal';
import ImportExportPanel from './ImportExportPanel';
import CopyButton from './CopyButton';

type Tab = 'overview' | 'deploy' | 'sync' | 'importexport' | 'settings';

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
        <span className="text-sm" style={{ color: '#9ca3af' }}>Loading...</span>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{ color: '#9ca3af' }}>Failed to load site.</span>
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
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-0 border-b" style={{ borderColor: '#3d4147' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#f9fafb' }}>
              {site.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: isRunning ? '#e05a2b' : '#6b7280' }}
              />
              <span className="text-sm" style={{ color: '#9ca3af' }}>
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
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium"
                style={{ backgroundColor: '#3d4147', color: '#f9fafb' }}
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
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium"
                style={{ backgroundColor: '#3d4147', color: '#f9fafb' }}
              >
                WP Admin
              </a>
            )}
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#3d4147', color: '#f9fafb' }}
              >
                {actionLoading ? 'Stopping...' : 'Stop'}
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#e05a2b', color: '#fff' }}
              >
                {actionLoading ? 'Starting...' : 'Start'}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <p className="text-sm mb-3" style={{ color: '#f87171' }}>{actionError}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === tab.id ? '#e05a2b' : 'transparent',
                color: activeTab === tab.id ? '#f9fafb' : '#9ca3af',
              }}
            >
              {tab.label}
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

  function openInFinder() {
    if (site.path) {
      fetch(`/api/sites/${site.slug}/open-finder`, { method: 'POST' });
    }
  }

  function openInEditor() {
    if (site.path) {
      fetch(`/api/sites/${site.slug}/open-editor`, { method: 'POST' });
    }
  }

  return (
    <div style={{ display: 'flex', gap: '40px' }}>
      {/* Left: Theme screenshot */}
      <div style={{ flexShrink: 0, width: '160px' }}>
        <div
          style={{
            width: '160px',
            height: '200px',
            backgroundColor: '#242830',
            border: '1px solid #3d4147',
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
                parent.innerHTML = '<span style="font-size:12px;color:#6b7280">No preview</span>';
              }
            }}
          />
        </div>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px', textAlign: 'center' }}>
          Active theme
        </p>
      </div>

      {/* Right: Quick actions */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Customize section */}
        <section>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af', marginBottom: '10px' }}>
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
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af', marginBottom: '10px' }}>
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
              label="VS Code"
              onClick={openInEditor}
              disabled={!site.path}
            />
            {wpAdminUrl && (
              <QuickActionButton
                icon={<ExternalLink size={14} />}
                label="WP Admin"
                href={wpAdminUrl}
                disabled={!isRunning}
              />
            )}
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
    <div
      style={{
        backgroundColor: '#242830',
        border: '1px solid #3d4147',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#6b7280',
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
            style={{
              fontSize: '14px',
              color: '#e05a2b',
              textDecoration: 'underline',
              fontFamily: mono ? 'monospace' : undefined,
              wordBreak: 'break-all',
            }}
          >
            {value}
          </a>
        ) : (
          <span
            style={{
              fontSize: '14px',
              color: '#f9fafb',
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

  const adminPassword = 'password';
  const adminEmail = 'admin@example.com';
  const adminUsername = 'admin';

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
        <h2 style={sectionHeadingStyle}>Site information</h2>
        <div style={cardStyle}>
          {/* Site name — inline editable */}
          <SettingsRow label="Site name">
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditingName(false); setNameValue(site.name); } }}
                  style={{
                    flex: 1,
                    backgroundColor: '#1a1d20',
                    color: '#f9fafb',
                    border: '1px solid #3d4147',
                    borderRadius: '5px',
                    padding: '4px 8px',
                    fontSize: '13px',
                  }}
                />
                <button
                  onClick={handleNameSave}
                  disabled={nameSaving}
                  style={{ ...smallButtonStyle, backgroundColor: '#e05a2b' }}
                >
                  {nameSaving ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameValue(site.name); }}
                  style={{ ...smallButtonStyle, backgroundColor: '#3d4147' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={valueStyle}>{site.name}</span>
                <button
                  onClick={() => setEditingName(true)}
                  style={{ fontSize: '11px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                >
                  Edit
                </button>
              </div>
            )}
            {nameError && <span style={{ fontSize: '12px', color: '#f87171' }}>{nameError}</span>}
          </SettingsRow>

          {site.url && (
            <SettingsRow label="Local URL">
              <span style={valueStyle}>{site.url}</span>
              <CopyButton value={site.url} />
            </SettingsRow>
          )}

          <SettingsRow label="Local path" last>
            <span style={{ ...valueStyle, fontFamily: 'monospace', fontSize: '12px' }}>{site.path ?? '—'}</span>
            {site.path && <CopyButton value={site.path} />}
          </SettingsRow>
        </div>
      </section>

      {/* WP Admin */}
      <section>
        <h2 style={sectionHeadingStyle}>WP Admin</h2>
        <div style={cardStyle}>
          {wpAdminUrl && (
            <SettingsRow label="Admin URL">
              <span style={valueStyle}>{wpAdminUrl}</span>
              <CopyButton value={wpAdminUrl} />
            </SettingsRow>
          )}
          <SettingsRow label="Username">
            <span style={valueStyle}>{adminUsername}</span>
            <CopyButton value={adminUsername} />
          </SettingsRow>
          <SettingsRow label="Password">
            <span style={valueStyle}>
              {showPassword ? adminPassword : '••••••••'}
            </span>
            <button
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? 'Hide password' : 'Show password'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
            >
              {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <CopyButton value={adminPassword} />
          </SettingsRow>
          <SettingsRow label="Email" last>
            <span style={valueStyle}>{adminEmail}</span>
            <CopyButton value={adminEmail} />
          </SettingsRow>
        </div>
      </section>

      {/* Staging configuration */}
      <section>
        <h2 style={sectionHeadingStyle}>Staging configuration</h2>
        <SiteSettingsPanel slug={slug} staging={site.staging} onSaved={onSaved} />
      </section>

      {/* Danger zone */}
      <section>
        <h2 style={{ ...sectionHeadingStyle, color: '#f87171' }}>Danger zone</h2>
        <div
          style={{
            backgroundColor: '#242830',
            border: '1px solid #3d4147',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#f9fafb', marginBottom: '2px' }}>Delete site</p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>Permanently remove this site and optionally its files.</p>
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
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '12px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#242830',
  border: '1px solid #3d4147',
  borderRadius: '8px',
  overflow: 'hidden',
};

const valueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#f9fafb',
  flex: 1,
  wordBreak: 'break-all',
};

const smallButtonStyle: React.CSSProperties = {
  color: '#fff',
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
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#242830',
    border: '1px solid #3d4147',
    borderRadius: '6px',
    fontSize: '13px',
    color: disabled ? '#6b7280' : '#f9fafb',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'background-color 0.15s',
  };

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {icon}{label}
      </a>
    );
  }

  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{ ...style, width: '100%', border: '1px solid #3d4147' }}>
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
        borderBottom: last ? 'none' : '1px solid #3d4147',
      }}
    >
      <span
        style={{
          fontSize: '13px',
          color: '#9ca3af',
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
