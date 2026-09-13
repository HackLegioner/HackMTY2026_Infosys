import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { ThemeProvider } from '@/context/ThemeContext';

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
    <html lang="es" className="dark">
      <body className="antialiased bg-[#09090b] text-[#fafafa] min-h-screen font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
