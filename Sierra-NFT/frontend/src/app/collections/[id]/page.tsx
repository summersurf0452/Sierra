/**
 * Collection Detail Page
 *
 * Shows collection header with stats, Items/Activity tabs.
 * Items tab: NFT grid with infinite scroll + filter sidebar.
 * Activity tab: Collection-wide transaction history table.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ShieldAlert, Flag } from 'lucide-react';
import { api } from '@/lib/api';
import { CollectionWithStats } from '@/types/nft';
import { cn } from '@/lib/utils';
import { ReportModal } from '@/components/nft/ReportModal';
import { CollectionHeader } from '@/components/collection/CollectionHeader';
import { CollectionActivity } from '@/components/collection/CollectionActivity';
import { FilterSidebar, FilterState } from '@/components/explore/FilterSidebar';
import { NFTGrid } from '@/components/nft/NFTGrid';
import { useInfiniteNFTs } from '@/hooks/useInfiniteNFTs';

type TabType = 'items' | 'activity';

export default function CollectionDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [showReportModal, setShowReportModal] = useState(false);
  const [filterParams, setFilterParams] = useState<Record<string, string>>({
    collectionId: id,
  });

  // Fetch collection detail
  const {
    data: collection,
    isLoading: collectionLoading,
    error: collectionError,
  } = useQuery({
    queryKey: ['collection-detail', id],
    queryFn: () =>
      api.get<CollectionWithStats>(`/collections/${id}/detail`),
    enabled: !!id,
  });

  // Infinite scroll NFTs for Items tab
  const { nfts, loading: nftsLoading, hasMore, sentinelRef, reset, total } =
    useInfiniteNFTs({
      endpoint: '/nfts',
      params: filterParams,
      enabled: activeTab === 'items' && !!id,
    });

  // Set document title
  useEffect(() => {
    if (collection?.name) {
      document.title = `${collection.name} - Sierra`;
    }
    return () => {
      document.title = 'Sierra';
    };
  }, [collection?.name]);

  // Handle filter apply
  const handleFilterApply = useCallback(
    (filters: FilterState) => {
      const newParams: Record<string, string> = {
        collectionId: id,
      };

      if (filters.minPrice) newParams.minPrice = filters.minPrice;
      if (filters.maxPrice) newParams.maxPrice = filters.maxPrice;
      if (filters.status !== 'all') newParams.status = filters.status;
      if (filters.sortBy !== 'newest') newParams.sortBy = filters.sortBy;

      setFilterParams(newParams);
      reset();
    },
    [id, reset],
  );

  // Loading skeleton
  if (collectionLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        {/* Cover skeleton */}
        <div className="h-48 animate-pulse rounded-t-lg bg-muted sm:h-64 lg:h-80" />
        {/* Info skeleton */}
        <div className="px-4 sm:px-6">
          <div className="-mt-12 mb-4 h-24 w-24 animate-pulse rounded-2xl bg-muted" />
          <div className="mb-2 h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
          {/* Tab skeleton */}
          <div className="flex gap-2">
            <div className="h-10 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-10 w-24 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // Hidden collection warning
  if (collection?.isHidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive/50" />
        <h2 className="text-xl font-semibold">Hidden Collection</h2>
        <p className="text-muted-foreground text-center">
          This collection has been hidden due to community reports.
        </p>
        <Link href="/" className="text-primary hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  // Not found
  if (collectionError || !collection) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">
          Collection not found
        </h2>
        <p className="text-muted-foreground">
          The collection you are looking for does not exist.
        </p>
        <Link
          href="/explore"
          className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Explore NFTs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Collection Header */}
      <CollectionHeader collection={collection} />

      {/* Report Button */}
      <div className="flex justify-end px-4 sm:px-6 mt-2">
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          title="Report this collection"
        >
          <Flag className="h-4 w-4" />
          <span>Report</span>
        </button>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="COLLECTION"
        targetId={id}
      />

      {/* Tabs */}
      <div className="px-4 sm:px-6">
        <div className="mb-6 flex gap-2 border-b border-border pb-4">
          <button
            onClick={() => setActiveTab('items')}
            className={cn(
              'rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'items'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            )}
          >
            Items{' '}
            {collection.totalSupply > 0 && (
              <span className="ml-1 text-xs opacity-80">
                ({collection.totalSupply})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              'rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'activity'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            )}
          >
            Activity
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'items' ? (
          <div className="flex gap-6">
            {/* Filter Sidebar */}
            <FilterSidebar
              onApply={handleFilterApply}
              initialFilters={{ sortBy: 'newest', status: 'all' }}
            />

            {/* NFT Grid + Infinite Scroll */}
            <div className="flex-1">
              <NFTGrid
                nfts={nfts}
                loading={nftsLoading && nfts.length === 0}
                emptyMessage="No NFTs in this collection yet"
              />

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  {nftsLoading && nfts.length > 0 && (
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </div>
              )}

              {/* Total count */}
              {!nftsLoading && nfts.length > 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Showing {nfts.length} of {total} items
                </p>
              )}
            </div>
          </div>
        ) : (
          <CollectionActivity collectionId={id} />
        )}
      </div>
    </div>
  );
}
