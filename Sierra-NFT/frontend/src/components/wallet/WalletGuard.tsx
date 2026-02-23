'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuthStore } from '@/store/authStore';
import { AlertCircle } from 'lucide-react';

/**
 * WalletGuard: Protects pages that require authentication
 *
 * Shows connect prompt when:
 * - User not connected to wallet
 * - User connected but not authenticated (SIWE not signed)
 *
 * Usage: Wrap protected page content with this component
 */
export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const { isAuthenticated } = useAuthStore();

  // Not connected to wallet
  if (!isConnected) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-lg border border-border bg-card p-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Wallet Connection Required</h2>
          <p className="text-muted-foreground">
            Please connect your wallet to use this feature.
          </p>
        </div>
        <ConnectButton />
      </div>
    );
  }

  // Connected but not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-lg border border-border bg-card p-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Sign In Required</h2>
          <p className="text-muted-foreground">
            Please sign a message to sign in to Sierra.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Click the &quot;Sign In&quot; button in the top right corner.
        </p>
      </div>
    );
  }

  // Authenticated - render protected content
  return <>{children}</>;
}
