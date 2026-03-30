import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Synced',
  description: 'Local WordPress dev. AI-assisted. Deployment included.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{ backgroundColor: '#1a1d20', color: '#f9fafb', height: '100vh', margin: 0 }}
        className="bg-background text-text"
      >
        {children}
      </body>
    </html>
  );
}
