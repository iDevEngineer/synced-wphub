import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1d20',
        sidebar: '#2b2f33',
        accent: '#e05a2b',
        running: '#e05a2b',
        stopped: '#6b7280',
        text: '#f9fafb',
        muted: '#9ca3af',
        border: '#3d4147',
      },
    },
  },
  plugins: [],
};

export default config;
