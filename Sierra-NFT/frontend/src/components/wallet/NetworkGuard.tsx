'use client';

import { useAccount, useSwitchChain } from 'wagmi';
import { AlertCircle } from 'lucide-react';
import { worldlandMainnet } from '@/lib/wagmi';

/**
 * NetworkGuard: Detects wrong network and prompts user to switch
 *
 * Shows a banner when user is connected but on wrong chain
 * Provides one-click network switching via MetaMask
 *
 * Auto-hides when:
 * - User not connected
 * - Already on WorldLand network
 */
export function NetworkGuard() {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  // Don't show if not connected or already on correct chain
  if (!isConnected || chain?.id === worldlandMainnet.id) {
    return null;
  }

  const handleSwitchNetwork = () => {
    switchChain({ chainId: worldlandMainnet.id });
  };

  return (
    <div className="border-b border-yellow-600/20 bg-yellow-500/10">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <p className="text-sm font-medium text-yellow-200">
              You are connected to the wrong network. Please switch to WorldLand Mainnet.
            </p>
          </div>
          <button
            onClick={handleSwitchNetwork}
            disabled={isPending}
            className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-yellow-400 disabled:opacity-50"
          >
            {isPending ? 'Switching...' : 'Switch to WorldLand'}
          </button>
        </div>
      </div>
    </div>
  );
}
