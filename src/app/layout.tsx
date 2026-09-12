import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Courier — AI Optimization Engine',
  description: 'Real-time multi-agent courier routing and earnings optimization for Monterrey',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0A0E1A] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
