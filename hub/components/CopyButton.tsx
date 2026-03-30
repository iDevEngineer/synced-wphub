'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  value: string;
  size?: number;
}

export default function CopyButton({ value, size = 13 }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: '4px',
          color: copied ? '#34d399' : '#6b7280',
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af';
        }}
        onMouseLeave={(e) => {
          if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
        }}
      >
        {copied ? <Check size={size} /> : <Copy size={size} />}
      </button>
      {copied && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '4px',
            backgroundColor: '#374151',
            color: '#f9fafb',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          Copied!
        </span>
      )}
    </div>
  );
}
