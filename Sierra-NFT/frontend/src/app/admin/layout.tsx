'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

/**
 * Admin Layout - Auth guard + sidebar layout for /admin routes
 *
 * Checks admin session on mount.
 * Redirects to /admin/login if not authenticated.
 * Login page renders without sidebar.
 * Authenticated pages render with AdminSidebar + main content area.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdminAuthenticated, checkSession } = useAdminAuth();
  const [checking, setChecking] = useState(true);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    const verify = async () => {
      const valid = await checkSession();
      if (!valid && !isLoginPage) {
        router.replace('/admin/login');
      }
      setChecking(false);
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginPage]);

  // Login page: no sidebar, no auth required
  if (isLoginPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Loading state while checking session
  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Verifying authentication...</div>
      </div>
    );
  }

  // Not authenticated: redirect handled by useEffect
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  // Authenticated: sidebar + main content
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:p-8 lg:ml-0">
        {children}
      </main>
    </div>
  );
}
