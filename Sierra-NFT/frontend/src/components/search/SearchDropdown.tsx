'use client';

import Link from 'next/link';
import { Mountain } from 'lucide-react';
import { SearchResults } from '@/types/nft';
import { formatWLC, ipfsToHttp } from '@/lib/utils';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { OptimizedImage } from '@/components/common/OptimizedImage';

interface SearchDropdownProps {
  results: SearchResults;
  query: string;
  onSelect: () => void;
  isLoading: boolean;
}

/**
 * SearchDropdown: Popover showing collection and NFT preview results
 *
 * Features:
 * - Two sections: Collections (up to 3) and NFTs (up to 5)
 * - Collection items show thumbnail + name + floor price
 * - NFT items show thumbnail + name + collection name + active listing price
 * - Loading skeleton shimmer state
 * - Empty state with mountain icon
 * - "View all results" link at bottom
 * - onClick each item calls onSelect() to close dropdown
 */
export function SearchDropdown({
  results,
  query,
  onSelect,
  isLoading,
}: SearchDropdownProps) {
  const hasCollections = results.collections.length > 0;
  const hasNfts = results.nfts.length > 0;
  const isEmpty = !hasCollections && !hasNfts && !isLoading;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[400px] overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
      {/* Loading State */}
      {isLoading && (
        <div className="p-4">
          <div className="mb-3">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Collections
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={`col-skel-${i}`} className="flex items-center gap-3 rounded-md p-2">
                <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-1 h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              NFTs
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`nft-skel-${i}`} className="flex items-center gap-3 rounded-md p-2">
                <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="mt-1 h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center p-8">
          <Mountain className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No results found for &apos;{query}&apos;
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !isEmpty && (
        <div className="p-2">
          {/* Collections Section */}
          {hasCollections && (
            <div className="mb-2">
              <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                Collections
              </div>
              {results.collections.slice(0, 3).map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  onClick={onSelect}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
                >
                  {/* Thumbnail */}
                  <OptimizedImage
                    src={collection.coverImageUrl ? ipfsToHttp(collection.coverImageUrl) : ''}
                    alt={collection.name}
                    variant="card"
                    className="h-10 w-10 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-medium text-foreground">
                      {collection.name}
                      {collection?.isVerified && <VerifiedBadge size="sm" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {collection.symbol}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* NFTs Section */}
          {hasNfts && (
            <div>
              {hasCollections && (
                <div className="mx-2 my-1 border-t border-border" />
              )}
              <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                NFTs
              </div>
              {results.nfts.slice(0, 5).map((nft) => {
                // Get active listing price if available
                const activePrice = nft.listings?.find(
                  (l) => l.status === 'ACTIVE',
                )?.price;

                return (
                  <Link
                    key={nft.id}
                    href={`/nft/${nft.id}`}
                    onClick={onSelect}
                    className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
                  >
                    {/* NFT Thumbnail */}
                    <OptimizedImage
                      src={nft.imageUrl ? ipfsToHttp(nft.imageUrl) : ''}
                      alt={nft.name || 'NFT'}
                      variant="card"
                      className="h-10 w-10 rounded-md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {nft.name || `#${nft.tokenId}`}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {nft.collection?.name || 'Unknown Collection'}
                      </p>
                    </div>
                    {activePrice && (
                      <span className="text-xs font-medium text-primary">
                        {formatWLC(activePrice)} WLC
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* View All Results */}
          <div className="mt-1 border-t border-border pt-1">
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              onClick={onSelect}
              className="flex items-center justify-center rounded-md p-2 text-sm font-medium text-primary transition-colors hover:bg-accent"
            >
              View all results
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
