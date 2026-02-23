'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Menu, X, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { SearchBar, MobileSearchBar } from '@/components/search/SearchBar';
import toast from 'react-hot-toast';

/**
 * Navbar: Main navigation with Sierra brand identity
 *
 * Features:
 * - Sierra logo image with mint/black brand colors
 * - Navigation links with mint accent hover
 * - RainbowKit wallet connect button
 * - SIWE sign in/out buttons
 * - Glassmorphism sticky header
 * - Mobile responsive with hamburger menu
 */
export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isConnected, address } = useAccount();
  const { isAuthenticated, user } = useAuthStore();
  const { signIn, signOut, checkSession, isLoading } = useAuth();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const navLinks = [
    { href: '/explore', label: 'Explore' },
    { href: '/mint', label: 'Mint' },
    { href: '/collections/create', label: 'Collections' },
    ...(isAuthenticated && address
      ? [{ href: `/profile/${address}`, label: 'Profile' }]
      : []),
  ];

  // Check session on mount (restore auth from cookie)
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      if (isConnected) {
        await checkSession();
      }
      if (!cancelled) {
        setIsCheckingSession(false);
      }
    };

    restoreSession();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const handleSignIn = async () => {
    try {
      await signIn();
      toast.success('Signed in successfully!');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to sign in');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <nav className="sticky top-0 z-50 sierra-glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 group">
            <Image
              src="/logo.png"
              alt="Sierra"
              width={500}
              height={500}
              className="w-36 h-auto transition-all duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_8px_rgba(61,209,131,0.4)]"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Search Bar (Desktop) */}
          <SearchBar />

          {/* Auth Section */}
          <div className="hidden items-center gap-3 md:flex">
            {/* Show wallet connect if not connected */}
            {!isConnected && (
              <ConnectButton chainStatus="icon" showBalance={false} />
            )}

            {/* Show Sign In if connected but not authenticated */}
            {isConnected && !isAuthenticated && !isCheckingSession && (
              <>
                <ConnectButton
                  chainStatus="icon"
                  showBalance={false}
                  accountStatus="avatar"
                />
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="sierra-btn-primary flex items-center gap-2 !px-4 !py-2 text-sm"
                >
                  <LogIn className="h-4 w-4" />
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </>
            )}

            {/* Show user info + Sign Out if authenticated */}
            {isAuthenticated && user && (
              <>
                <ConnectButton
                  chainStatus="icon"
                  showBalance={false}
                  accountStatus={{
                    smallScreen: 'avatar',
                    largeScreen: 'full',
                  }}
                />
                <Link
                  href={`/profile/${address}`}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  {user.nickname || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="sierra-btn-secondary flex items-center gap-2 !px-4 !py-2 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoading ? 'Signing out...' : 'Sign Out'}
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-4 pb-4 pt-2">
            {/* Mobile Search Bar */}
            <div className="mb-2">
              <MobileSearchBar />
            </div>

            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile Auth Section */}
            <div className="space-y-2 pt-4 border-t border-border/50">
              <ConnectButton chainStatus="icon" showBalance={false} />

              {isConnected && !isAuthenticated && !isCheckingSession && (
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="sierra-btn-primary flex w-full items-center justify-center gap-2 text-sm"
                >
                  <LogIn className="h-4 w-4" />
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              )}

              {isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="sierra-btn-secondary flex w-full items-center justify-center gap-2 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoading ? 'Signing out...' : 'Sign Out'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
