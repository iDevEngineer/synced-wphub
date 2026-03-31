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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60"
      style={{ zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget && phase === 'input') onClose(); }}
    >
      <div
        className="bg-surface border border-border rounded-lg flex flex-col overflow-hidden"
        style={{ width: '480px', maxWidth: 'calc(100vw - 32px)' }}
      >

        {/* Header */}
        <div className="border-b border-border" style={{ padding: '20px 24px 16px' }}>
          <h2 className="text-text" style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            {phase === 'done' ? 'Site created' : phase === 'error' ? 'Creation failed' : 'Create site'}
          </h2>
          {phase === 'input' && (
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '13px' }}>
              Enter a name for the new WordPress site.
            </p>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {phase === 'input' && (
            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>
                Site name
              </label>
              <input
                ref={inputRef}
                type="text"
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-bg border border-border text-text"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {(phase === 'progress' || phase === 'done') && (
            <div>
              <p className="text-muted" style={{ margin: '0 0 8px', fontSize: '13px' }}>
                {phase === 'done' ? 'All done.' : 'Creating your site — this may take a minute…'}
              </p>
              <div
                ref={logRef}
                className="bg-bg border border-border text-muted"
                style={{
                  borderRadius: '6px',
                  padding: '12px',
                  height: '220px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: '1.6',
                }}
              >
                {logs.map((line, i) => (
                  <div key={i} className={line.startsWith('✓') || line.startsWith('Site created') ? 'text-green-400' : 'text-muted'}>
                    {line}
                  </div>
                ))}
                {phase === 'progress' && (
                  <div className="text-accent" style={{ marginTop: '4px' }}>▋</div>
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
              <p className="text-red-400" style={{ margin: 0, fontSize: '13px' }}>
                {errorMsg ?? 'An error occurred.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {phase === 'input' && (
            <>
              <button
                className="text-muted border border-border"
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'transparent',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="bg-accent text-white"
                style={{
                  padding: '8px 18px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: name.trim() ? 'pointer' : 'default',
                  opacity: name.trim() ? 1 : 0.5,
                }}
                disabled={!name.trim()}
                onClick={handleCreate}
              >
                Create
              </button>
            </>
          )}

          {phase === 'progress' && (
            <span className="text-muted" style={{ fontSize: '13px', alignSelf: 'center' }}>
              Please wait…
            </span>
          )}

          {(phase === 'done' || phase === 'error') && (
            <button
              className="bg-accent text-white"
              style={{
                padding: '8px 18px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
