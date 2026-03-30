'use client';

import { useRef, useState, useEffect } from 'react';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

type Phase = 'input' | 'progress' | 'done' | 'error';

export default function CreateSiteModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (phase === 'input') {
      inputRef.current?.focus();
    }
  }, [phase]);

  // Auto-scroll log to bottom as lines arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Close on Escape (only in input phase)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase === 'input') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onClose]);

  async function handleCreate() {
    if (!name.trim()) return;

    setPhase('progress');
    setLogs([]);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg((data as { error?: string }).error ?? 'Request failed.');
        setPhase('error');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim()) as {
              type: string;
              message: string;
            };
            if (payload.type === 'log') {
              setLogs((prev) => [...prev, payload.message]);
            } else if (payload.type === 'done') {
              setLogs((prev) => [...prev, payload.message]);
              setPhase('done');
              onCreated();
            } else if (payload.type === 'error') {
              setErrorMsg(payload.message);
              setPhase('error');
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error.');
      setPhase('error');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleCreate();
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  };

  const modal: React.CSSProperties = {
    backgroundColor: '#2b2f33',
    border: '1px solid #3d4147',
    borderRadius: '8px',
    width: '480px',
    maxWidth: 'calc(100vw - 32px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const header: React.CSSProperties = {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #3d4147',
  };

  const body: React.CSSProperties = {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const footer: React.CSSProperties = {
    padding: '12px 24px 20px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    backgroundColor: '#1a1d20',
    border: '1px solid #3d4147',
    borderRadius: '6px',
    color: '#f9fafb',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const logArea: React.CSSProperties = {
    backgroundColor: '#1a1d20',
    border: '1px solid #3d4147',
    borderRadius: '6px',
    padding: '12px',
    height: '220px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.6',
    color: '#9ca3af',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '8px 18px',
    backgroundColor: '#e05a2b',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  };

  const btnPrimaryDisabled: React.CSSProperties = {
    ...btnPrimary,
    opacity: 0.5,
    cursor: 'default',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '8px 18px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid #3d4147',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget && phase === 'input') onClose(); }}>
      <div style={modal}>

        {/* Header */}
        <div style={header}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f9fafb' }}>
            {phase === 'done' ? 'Site created' : phase === 'error' ? 'Creation failed' : 'Create site'}
          </h2>
          {phase === 'input' && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
              Enter a name for the new WordPress site.
            </p>
          )}
        </div>

        {/* Body */}
        <div style={body}>
          {phase === 'input' && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#9ca3af' }}>
                Site name
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                style={inputStyle}
              />
            </div>
          )}

          {(phase === 'progress' || phase === 'done') && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#9ca3af' }}>
                {phase === 'done' ? 'All done.' : 'Creating your site — this may take a minute…'}
              </p>
              <div ref={logRef} style={logArea}>
                {logs.map((line, i) => (
                  <div key={i} style={{ color: line.startsWith('✓') || line.startsWith('Site created') ? '#4ade80' : '#9ca3af' }}>
                    {line}
                  </div>
                ))}
                {phase === 'progress' && (
                  <div style={{ color: '#e05a2b', marginTop: '4px' }}>▋</div>
                )}
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div style={{
              backgroundColor: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '6px',
              padding: '12px',
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>
                {errorMsg ?? 'An error occurred.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footer}>
          {phase === 'input' && (
            <>
              <button style={btnSecondary} onClick={onClose}>
                Cancel
              </button>
              <button
                style={name.trim() ? btnPrimary : btnPrimaryDisabled}
                disabled={!name.trim()}
                onClick={handleCreate}
              >
                Create
              </button>
            </>
          )}

          {phase === 'progress' && (
            <span style={{ fontSize: '13px', color: '#9ca3af', alignSelf: 'center' }}>
              Please wait…
            </span>
          )}

          {(phase === 'done' || phase === 'error') && (
            <button style={btnPrimary} onClick={onClose}>
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
