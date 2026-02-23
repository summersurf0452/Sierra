/**
 * NFTDetail - NFT Detail View
 *
 * OptimizedImage variant="detail" (1200px) + name + description + owner + ListingPanel
 */

'use client';

import { NFT } from '@/types/nft';
import { shortenAddress, ipfsToHttp } from '@/lib/utils';
import { ListingPanel } from './ListingPanel';
import { OptimizedImage } from '@/components/common/OptimizedImage';

interface NFTDetailProps {
  nft: NFT;
}

export function NFTDetail({ nft }: NFTDetailProps) {
  const imageSrc = nft.imageUrl ? ipfsToHttp(nft.imageUrl) : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: NFT Image */}
      <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
        <OptimizedImage
          src={imageSrc}
          alt={nft.name || `NFT #${nft.tokenId}`}
          variant="detail"
          objectFit="contain"
          className="h-full w-full"
        />
      </div>

      {/* Right: NFT Info + Listing Panel */}
      <div className="space-y-6">
        {/* Collection name */}
        {nft.collection && (
          <div className="text-sm text-muted-foreground">
            {nft.collection.name}
          </div>
        )}

        {/* NFT name */}
        <h1 className="text-4xl font-bold">
          {nft.name || `NFT #${nft.tokenId}`}
        </h1>

        {/* Owner */}
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Owner</div>
          <div className="text-lg font-mono">{shortenAddress(nft.owner)}</div>
        </div>

        {/* Description */}
        {nft.description && (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Description</div>
            <p className="text-muted-foreground">{nft.description}</p>
          </div>
        )}

        {/* Listing Panel */}
        <ListingPanel nft={nft} />
      </div>
    </div>
  );
}
