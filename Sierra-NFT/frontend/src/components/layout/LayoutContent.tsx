'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { NetworkGuard } from '@/components/wallet/NetworkGuard';
import { Toaster } from 'react-hot-toast';

interface LayoutContentProps {
  children: React.ReactNode;
}

/**
 * LayoutContent - Client component for conditional layout rendering
 *
 * Hides Navbar, NetworkGuard, and Footer for /admin routes.
 * Keeps Toaster visible on all routes.
 */
export function LayoutContent({ children }: LayoutContentProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <>
      {!isAdmin && <Navbar />}
      {!isAdmin && <NetworkGuard />}
      <main className="flex-1">{children}</main>
      {!isAdmin && <Footer />}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </>
  );
}
