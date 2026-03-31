'use client';

import { useEffect } from 'react';

export default function ThemeApplier() {
  useEffect(() => {
    async function applyTheme() {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const data = await res.json();
        // Config is nested under data.config
        const theme: string = (data.config?.theme as string) ?? 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
      } catch {
        // Fail silently — default dark theme remains
      }
    }
    applyTheme();

    // Listen for live theme changes from SettingsModal
    const handler = (e: Event) => {
      const theme = (e as CustomEvent).detail;
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
    };
    window.addEventListener('synced:theme-change', handler);
    return () => window.removeEventListener('synced:theme-change', handler);
  }, []);

  return null;
}
