'use client';

import { darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';

import '@rainbow-me/rainbowkit/styles.css';

/**
 * Web3Provider: Wraps the app with all necessary Web3 and theme providers
 *
 * - WagmiProvider: Wagmi configuration for blockchain interactions
 * - QueryClientProvider: React Query for async state management
 * - RainbowKitProvider: Wallet connection UI with custom dark theme
 * - ThemeProvider: next-themes for dark/light mode
 */
export function Web3Provider({ children }: { children: React.ReactNode }) {
  // Create QueryClient once per client session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#3dd183', // Sierra mint
            accentColorForeground: '#030a06',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
