'use client';

import Link from 'next/link';
import { NFT } from '@/types/nft';
import { formatWLC, ipfsToHttp } from '@/lib/utils';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { OptimizedImage } from '@/components/common/OptimizedImage';

interface NFTCardProps {
  nft: NFT;
}

/**
 * NFTCard: Display NFT card with image, name, price, and collection
 *
 * Features:
 * - OptimizedImage with variant="card" (~300px thumbnail)
 * - NFT name and collection name
 * - Price in WLC (if listed)
 * - Hover scale animation
 * - Link to NFT detail page
 * - Shimmer skeleton loading + error fallback via OptimizedImage
 */
export function NFTCard({ nft }: NFTCardProps) {
  // Get active listing if exists
  const activeListing = nft.listings?.find((l) => l.status === 'ACTIVE');

  // Resolve image source: DB cached imageUrl > tokenURI (handled by OptimizedImage fallback)
  const imageSrc = nft.imageUrl ? ipfsToHttp(nft.imageUrl) : '';

  return (
    <Link href={`/nft/${nft.id}`}>
      <div className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-lg">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <OptimizedImage
            src={imageSrc}
            alt={nft.name || 'NFT'}
            variant="card"
            objectFit="contain"
            className="h-full w-full transition-transform group-hover:scale-105"
          />

          {/* ERC-1155 Edition Badge */}
          {nft.contractType === 'ERC1155' && nft.supply > 1 && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-full">
              x{nft.supply}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          {/* NFT Name */}
          <h3 className="truncate text-base font-semibold text-foreground">
            {nft.name || `#${nft.tokenId}`}
          </h3>

          {/* Collection Name */}
          {nft.collection && (
            <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
              {nft.collection.name}
              {nft.collection?.isVerified && <VerifiedBadge size="sm" />}
            </p>
          )}

          {/* Price */}
          <div className="mt-3 flex items-center justify-between">
            {activeListing ? (
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-lg font-bold text-foreground">
                  {formatWLC(activeListing.price)} WLC
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not listed</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
