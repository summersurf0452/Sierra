'use client';

import { NFT } from '@/types/nft';
import { NFTCard } from './NFTCard';

interface NFTGridProps {
  nfts: NFT[];
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * NFTGrid: Responsive grid layout for NFT cards
 *
 * Features:
 * - Responsive grid (1/2/3/4 columns)
 * - Skeleton loading state
 * - Empty state message
 */
export function NFTGrid({
  nfts,
  loading = false,
  emptyMessage = 'No NFTs found',
}: NFTGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {nfts.map((nft) => (
        <NFTCard key={nft.id} nft={nft} />
      ))}
    </div>
  );
}

/**
 * SkeletonCard: Loading skeleton for NFT card
 */
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Image skeleton */}
      <div className="aspect-square animate-pulse bg-muted" />

      {/* Info skeleton */}
      <div className="p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-6 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
