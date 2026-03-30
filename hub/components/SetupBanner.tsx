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
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '12px 20px',
        backgroundColor: '#1f2124',
        borderLeft: '3px solid #f97316',
        borderBottom: '1px solid #3d4147',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#f9fafb' }}>
          Synced isn&apos;t set up yet.
        </span>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
          Run{' '}
          <code
            style={{
              backgroundColor: '#2b2f33',
              padding: '1px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#f9fafb',
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
          style={{
            padding: '5px 12px',
            borderRadius: '5px',
            fontSize: '13px',
            fontWeight: 500,
            backgroundColor: '#2b2f33',
            color: copied ? '#4ade80' : '#f9fafb',
            border: '1px solid #3d4147',
            cursor: 'pointer',
            transition: 'color 0.15s',
          }}
        >
          {copied ? 'Copied!' : 'Copy command'}
        </button>

        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '16px',
            lineHeight: 1,
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
