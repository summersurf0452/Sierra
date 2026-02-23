'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShieldCheck, Flag, BarChart3, LogOut, Menu, X } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/collections', label: 'Collections', icon: ShieldCheck },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/metrics', label: 'Metrics', icon: BarChart3 },
];

/**
 * AdminSidebar - Sierra Admin navigation sidebar
 *
 * Fixed left sidebar with navigation links and logout.
 * Responsive: hamburger menu on mobile.
 * Sierra red+black theme.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname?.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold">
          <span className="text-primary">Sierra</span>{' '}
          <span className="text-muted-foreground">Admin</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: fixed left, Mobile: slide-in overlay */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
