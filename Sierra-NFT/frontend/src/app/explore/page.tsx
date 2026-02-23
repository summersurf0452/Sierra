'use client';

import { useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NFTCard } from '@/components/nft/NFTCard';
import { FilterSidebar, FilterState } from '@/components/explore/FilterSidebar';
import { SortSelect } from '@/components/explore/SortSelect';
import { useInfiniteNFTs } from '@/hooks/useInfiniteNFTs';
import { Loader2, PackageOpen } from 'lucide-react';

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial filter state from URL params
  const initialFilters: Partial<FilterState> = useMemo(
    () => ({
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      status:
        (searchParams.get('status') as FilterState['status']) || 'all',
      category: searchParams.get('category') || 'all',
      sortBy:
        (searchParams.get('sortBy') as FilterState['sortBy']) || 'newest',
    }),
    [searchParams],
  );

  // Build query params for useInfiniteNFTs from URL search params
  const nftParams = useMemo(() => {
    const p: Record<string, string> = {};

    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy');

    if (minPrice) p.minPrice = minPrice;
    if (maxPrice) p.maxPrice = maxPrice;
    if (status && status !== 'all') p.status = status;
    if (category && category !== 'all') p.category = category;
    if (sortBy) p.sortBy = sortBy;

    return p;
  }, [searchParams]);

  const { nfts, loading, hasMore, sentinelRef, total } = useInfiniteNFTs({
    params: nftParams,
  });

  // Update URL with new filter params
  const updateURL = useCallback(
    (filters: Partial<FilterState>) => {
      const params = new URLSearchParams();

      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.status && filters.status !== 'all')
        params.set('status', filters.status);
      if (filters.category && filters.category !== 'all')
        params.set('category', filters.category);
      if (filters.sortBy && filters.sortBy !== 'newest')
        params.set('sortBy', filters.sortBy);

      const qs = params.toString();
      router.replace(`/explore${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router],
  );

  // Handle Apply from FilterSidebar
  const handleApply = useCallback(
    (filters: FilterState) => {
      updateURL(filters);
    },
    [updateURL],
  );

  // Handle Sort change (immediate, no Apply needed)
  const handleSortChange = useCallback(
    (sortBy: string) => {
      const current: Partial<FilterState> = {
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        status:
          (searchParams.get('status') as FilterState['status']) || 'all',
        category: searchParams.get('category') || 'all',
        sortBy: sortBy as FilterState['sortBy'],
      };
      updateURL(current);
    },
    [searchParams, updateURL],
  );

  // Handle Clear all filters
  const handleClearFilters = useCallback(() => {
    router.replace('/explore', { scroll: false });
  }, [router]);

  const currentSortBy = searchParams.get('sortBy') || 'newest';
  const isFiltered = searchParams.toString().length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Explore NFTs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total > 0 ? `${total} NFTs` : 'Browse and discover NFTs'}
          </p>
        </div>
        <SortSelect value={currentSortBy} onChange={handleSortChange} />
      </div>

      {/* Main Content: Sidebar + Grid */}
      <div className="flex gap-8">
        {/* Filter Sidebar (Desktop) + Mobile Bottom Sheet */}
        <FilterSidebar onApply={handleApply} initialFilters={initialFilters} />

        {/* NFT Grid */}
        <div className="min-w-0 flex-1">
          {/* Grid */}
          {nfts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {nfts.map((nft) => (
                <NFTCard key={nft.id} nft={nft} />
              ))}
            </div>
          ) : !loading ? (
            /* Empty state */
            <div className="flex min-h-[400px] flex-col items-center justify-center">
              <PackageOpen className="mb-4 h-16 w-16 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">
                No NFTs match your filters
              </p>
              {isFiltered && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : null}

          {/* Loading indicator */}
          {loading && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Loading NFTs...
              </span>
            </div>
          )}

          {/* Sentinel div for infinite scroll trigger */}
          {hasMore && !loading && (
            <div ref={sentinelRef} className="h-10" aria-hidden="true" />
          )}

          {/* End of results */}
          {!hasMore && nfts.length > 0 && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              All {total} NFTs loaded
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-9 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-5 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
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
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
