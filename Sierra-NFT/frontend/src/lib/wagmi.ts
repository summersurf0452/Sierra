import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

/**
 * WorldLand Testnet (Gwangju)
 * - Chain ID: 10395
 * - Native Currency: WLC (Worldland)
 * - RPC: https://gwangju.worldland.foundation
 * - Explorer: https://testscan.worldland.foundation
 */
export const worldlandTestnet = defineChain({
  id: 10395,
  name: 'WorldLand Testnet',
  nativeCurrency: {
    name: 'Worldland',
    symbol: 'WLC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://gwangju.worldland.foundation'],
    },
    public: {
      http: ['https://gwangju.worldland.foundation'],
    },
  },
  blockExplorers: {
    default: {
      name: 'WorldLand Testnet Explorer',
      url: 'https://testscan.worldland.foundation',
    },
  },
  testnet: true,
});

/**
 * WorldLand Mainnet (Seoul)
 * - Chain ID: 103
 * - Native Currency: WLC (Worldland)
 * - RPC: https://seoul.worldland.foundation
 * - Explorer: https://scan.worldland.foundation
 */
export const worldlandMainnet = defineChain({
  id: 103,
  name: 'WorldLand Mainnet',
  nativeCurrency: {
    name: 'Worldland',
    symbol: 'WLC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://seoul.worldland.foundation'],
    },
    public: {
      http: ['https://seoul.worldland.foundation'],
    },
  },
  blockExplorers: {
    default: {
      name: 'WorldLand Explorer',
      url: 'https://scan.worldland.foundation',
    },
  },
  testnet: false,
});

export const config = getDefaultConfig({
  appName: 'Sierra',
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    'placeholder-project-id',
  chains: [worldlandMainnet],
  ssr: true,
});
