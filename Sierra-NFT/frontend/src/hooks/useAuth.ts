'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { api } from '@/lib/api';
import { useAuthStore, User } from '@/store/authStore';

/**
 * Authentication hook for SIWE (Sign-In with Ethereum)
 *
 * Flow:
 * 1. User connects wallet (handled by RainbowKit)
 * 2. signIn() fetches nonce from backend
 * 3. User signs SIWE message with wallet
 * 4. Backend verifies signature and sets JWT cookie
 * 5. Frontend fetches user profile and updates auth store
 *
 * Features:
 * - SIWE standard message signing
 * - JWT session via HttpOnly cookie
 * - Session persistence check
 * - Automatic logout on API 401 errors
 */
export function useAuth() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setAuth, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Sign in with SIWE
   *
   * @throws {Error} If wallet not connected, signing fails, or verification fails
   */
  const signIn = async () => {
    if (!address || !chainId) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);

    try {
      // Step 1: Fetch nonce from backend
      const { nonce } = await api.get<{ nonce: string }>(
        `/auth/nonce?address=${address}`,
      );

      // Step 2: Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Sierra',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });

      const preparedMessage = message.prepareMessage();

      // Step 3: Sign message with wallet
      const signature = await signMessageAsync({
        message: preparedMessage,
      });

      // Step 4: Verify signature and get JWT cookie
      await api.post('/auth/verify', {
        message: preparedMessage,
        signature,
      });

      // Step 5: Fetch user profile
      const { user } = await api.get<{ user: User }>('/auth/me');

      // Step 6: Update auth store
      setAuth(address, user);

      return user;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign out
   *
   * Clears JWT cookie on backend and auth store on frontend
   */
  const signOut = async () => {
    setIsLoading(true);

    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      storeLogout();
      setIsLoading(false);
    }
  };

  /**
   * Check if session is still valid
   *
   * Useful for checking auth on page load
   *
   * @returns {Promise<boolean>} True if session is valid
   */
  const checkSession = async (): Promise<boolean> => {
    // Skip if already not authenticated (avoid unnecessary 401 calls)
    const { isAuthenticated: currentAuth } = useAuthStore.getState();
    if (!currentAuth && !address) return false;

    try {
      const { user } = await api.get<{ user: User }>('/auth/me');
      if (address && user) {
        setAuth(address, user);
      }
      return true;
    } catch {
      // Session invalid - api.ts 401 handler already called logout
      return false;
    }
  };

  return {
    signIn,
    signOut,
    checkSession,
    isLoading,
  };
}
