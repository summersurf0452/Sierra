'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Mountain, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { NFTGrid } from '@/components/nft/NFTGrid';
import { SearchResults, Collection } from '@/types/nft';
import { shortenAddress, ipfsToHttp } from '@/lib/utils';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';

function CollectionCard({ collection }: { collection: Collection }) {
  const coverUrl = collection.coverImageUrl
    ? ipfsToHttp(collection.coverImageUrl)
    : null;

  return (
    <Link href={`/collections/${collection.id}`}>
      <div className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-lg">
        {/* Cover Image */}
        <div className="relative aspect-[3/2] overflow-hidden bg-muted">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={collection.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-4xl font-bold text-primary/30">
                {collection.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="flex items-center gap-1 truncate text-base font-semibold text-foreground">
            {collection.name}
            {collection?.isVerified && <VerifiedBadge size="sm" />}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            by {shortenAddress(collection.creator)}
          </p>
          {collection.category && collection.category !== 'Other' && (
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {collection.category}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  const {
    data: results,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['search-full', query],
    queryFn: () =>
      api.get<SearchResults>(
        `/search?q=${encodeURIComponent(query)}&limit=50`,
      ),
    enabled: query.length >= 1,
  });

  const collectionsCount = results?.collections?.length || 0;
  const nftsCount = results?.nfts?.length || 0;
  const hasResults = collectionsCount > 0 || nftsCount > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {query
            ? `Search results for '${query}'`
            : 'Search'}
        </h1>
        {!isLoading && hasResults && (
          <p className="mt-2 text-sm text-muted-foreground">
            {collectionsCount > 0 && `${collectionsCount} collection${collectionsCount !== 1 ? 's' : ''}`}
            {collectionsCount > 0 && nftsCount > 0 && ', '}
            {nftsCount > 0 && `${nftsCount} NFT${nftsCount !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-8">
          {/* Collection skeletons */}
          <div>
            <div className="mb-4 h-7 w-40 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`col-skel-${i}`}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="aspect-[3/2] animate-pulse bg-muted" />
                  <div className="p-4">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NFT skeletons */}
          <div>
            <div className="mb-4 h-7 w-24 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`nft-skel-${i}`}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="aspect-square animate-pulse bg-muted" />
                  <div className="p-4">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="mt-3 h-6 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No query */}
      {!query && !isLoading && (
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <Mountain className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">
            Enter a search term to find NFTs and collections
          </p>
          <Link
            href="/explore"
            className="mt-4 text-sm text-primary transition-colors hover:text-primary/80"
          >
            Or browse all NFTs
          </Link>
        </div>
      )}

      {/* Empty state (no results) */}
      {query && !isLoading && !hasResults && (
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <Mountain className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">
            No results for &apos;{query}&apos;
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try different keywords or browse collections
          </p>
          <Link
            href="/explore"
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse NFTs
          </Link>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasResults && (
        <div className="space-y-10">
          {/* Collections Section */}
          {collectionsCount > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                Collections ({collectionsCount})
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {results!.collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                  />
                ))}
              </div>
            </section>
          )}

          {/* NFTs Section */}
          {nftsCount > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                NFTs ({nftsCount})
              </h2>
              <NFTGrid nfts={results!.nfts} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-9 w-64 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-5 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
