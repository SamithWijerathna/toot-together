import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Toot Together: 3D Co-op Physics Party',
  description: 'Hilarious 3D multiplayer co-op comedy game with ragdoll physics, fart-boost acrobatics, moving obstacles, and teamwork challenges.',
  openGraph: {
    title: 'Toot Together: 3D Co-op Physics Party',
    description: 'Hilarious 3D multiplayer co-op comedy game with ragdoll physics, fart-boost acrobatics, moving obstacles, and teamwork challenges.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Toot Together: 3D Co-op Physics Party',
    description: 'Hilarious 3D multiplayer co-op comedy game with ragdoll physics, fart-boost acrobatics, moving obstacles, and teamwork challenges.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="w-full h-full bg-slate-950 overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
