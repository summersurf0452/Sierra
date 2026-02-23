/**
 * Contract addresses for Sierra NFT Marketplace
 *
 * These addresses are loaded from environment variables.
 * They will be set after contract deployment in Phase 1.
 */

export const NFT721_ADDRESS =
  (process.env.NEXT_PUBLIC_NFT721_ADDRESS as `0x${string}`) || '0x';

export const NFT1155_ADDRESS =
  (process.env.NEXT_PUBLIC_NFT1155_ADDRESS as `0x${string}`) || '0x';

export const MARKETPLACE_ADDRESS =
  (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS as `0x${string}`) || '0x';

export const AUCTION_ADDRESS =
  (process.env.NEXT_PUBLIC_AUCTION_ADDRESS as `0x${string}`) || '0x';

export const OFFERS_ADDRESS =
  (process.env.NEXT_PUBLIC_OFFERS_ADDRESS as `0x${string}`) || '0x';

export const MARKETPLACE1155_ADDRESS =
  (process.env.NEXT_PUBLIC_MARKETPLACE1155_ADDRESS as `0x${string}`) || '0x';

export const CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID || '103',
  10,
);
