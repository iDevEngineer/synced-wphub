'use client';

import { useEffect } from 'react';

export default function ThemeApplier() {
  useEffect(() => {
    async function applyTheme() {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const data = await res.json();
        const theme: string = (data.config?.theme as string) ?? 'dark';
        const body = document.body;
        body.setAttribute('data-theme', theme);
      } catch {
        // Fail silently — default dark theme remains
      }
    }
    applyTheme();
  }, []);

  return null;
}
