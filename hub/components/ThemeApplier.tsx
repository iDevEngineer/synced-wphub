'use client';

import { useEffect } from 'react';

export default function ThemeApplier() {
  useEffect(() => {
    async function applyTheme() {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const data = await res.json();
        // Handle both { theme } and { config: { theme } } response shapes
        const theme: string = (data.theme as string) ?? (data.config?.theme as string) ?? 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
      } catch {
        // Fail silently — default dark theme remains
      }
    }
    applyTheme();

    // Listen for theme changes dispatched by SettingsModal
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
