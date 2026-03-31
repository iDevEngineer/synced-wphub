'use client';

import { useState } from 'react';

interface Props {
  onDismiss: () => void;
}

export default function SetupBanner({ onDismiss }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText('synced setup');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silent fail
    }
  }

  return (
    <div
      className="border-b border-border"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '12px 20px',
        backgroundColor: 'var(--color-bg)',
        borderLeft: '3px solid var(--color-accent)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span className="text-text" style={{ fontSize: '14px', fontWeight: 600 }}>
          Synced isn&apos;t set up yet.
        </span>
        <span className="text-muted" style={{ fontSize: '13px' }}>
          Run{' '}
          <code
            className="bg-surface text-text"
            style={{
              padding: '1px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          >
            synced setup
          </code>{' '}
          in your terminal to get started.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleCopy}
          className="bg-surface border border-border"
          style={{
            padding: '5px 12px',
            borderRadius: '5px',
            fontSize: '13px',
            fontWeight: 500,
            color: copied ? 'var(--tw-color-green-400, #4ade80)' : 'var(--color-text)',
            cursor: 'pointer',
            transition: 'color 0.15s',
          }}
        >
          {copied ? 'Copied!' : 'Copy command'}
        </button>

        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-stopped"
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '16px',
            lineHeight: 1,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-stopped)'; }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
