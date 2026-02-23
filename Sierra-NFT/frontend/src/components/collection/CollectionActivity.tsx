/**
 * CollectionActivity - Activity tab for collection detail page
 *
 * Shows unified activity timeline from NFT listing data.
 * Fetches NFTs for the collection and flattens listing data into activity rows.
 *
 * Features:
 * - Event type filter buttons (All | Listed | Sold | Canceled)
 * - Desktop table layout (Event | Item | Price | From | To | Time)
 * - Mobile card layout
 * - Skeleton loading state
 * - Empty state
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Tag, ShoppingCart, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { NFT, Listing, ListingStatus } from '@/types/nft';
import { formatWLC, shortenAddress, cn, ipfsToHttp } from '@/lib/utils';
import { OptimizedImage } from '@/components/common/OptimizedImage';

interface CollectionActivityProps {
  collectionId: string;
}

interface ActivityRow {
  id: string;
  event: 'Listed' | 'Sale' | 'Cancel';
  nftId: string;
  nftName: string;
  nftImageUrl: string | null;
  price: string | null;
  from: string | null;
  to: string | null;
  timestamp: string;
}

const EVENT_FILTERS = [
  { value: '', label: 'All' },
  { value: 'Listed', label: 'Listed' },
  { value: 'Sale', label: 'Sold' },
  { value: 'Cancel', label: 'Canceled' },
];

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getEventIcon(event: string) {
  switch (event) {
    case 'Listed':
      return <Tag className="h-3.5 w-3.5" />;
    case 'Sale':
      return <ShoppingCart className="h-3.5 w-3.5" />;
    case 'Cancel':
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function getEventStyle(event: string) {
  switch (event) {
    case 'Listed':
      return 'bg-blue-500/10 text-blue-500';
    case 'Sale':
      return 'bg-green-500/10 text-green-500';
    case 'Cancel':
      return 'bg-gray-500/10 text-gray-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function CollectionActivity({ collectionId }: CollectionActivityProps) {
  const [eventFilter, setEventFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['collection-activity', collectionId],
    queryFn: () =>
      api.get<{ data: NFT[]; total: number }>(
        `/nfts?collectionId=${collectionId}&limit=100`,
      ),
  });

  // Extract activity rows from NFT listings
  const activities: ActivityRow[] = [];
  if (data?.data) {
    for (const nft of data.data) {
      if (!nft.listings) continue;
      for (const listing of nft.listings) {
        let event: ActivityRow['event'];
        let to: string | null = null;

        switch (listing.status) {
          case ListingStatus.ACTIVE:
            event = 'Listed';
            break;
          case ListingStatus.SOLD:
            event = 'Sale';
            to = listing.buyer;
            break;
          case ListingStatus.CANCELED:
            event = 'Cancel';
            break;
          default:
            continue;
        }

        activities.push({
          id: listing.id,
          event,
          nftId: nft.id,
          nftName: nft.name || `#${nft.tokenId}`,
          nftImageUrl: nft.imageUrl,
          price: listing.price,
          from: listing.seller,
          to,
          timestamp: listing.updatedAt || listing.createdAt,
        });
      }
    }
  }

  // Sort by timestamp descending
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Apply event filter
  const filteredActivities = eventFilter
    ? activities.filter((a) => a.event === eventFilter)
    : activities;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Filter skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-20 animate-pulse rounded-full bg-muted"
            />
          ))}
        </div>
        {/* Table skeleton */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Event Type Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {EVENT_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setEventFilter(filter.value)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              eventFilter === filter.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredActivities.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-muted-foreground">
            No activity in this collection yet
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">Event</th>
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">From</th>
                  <th className="pb-3 font-medium">To</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => (
                  <tr
                    key={activity.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          getEventStyle(activity.event),
                        )}
                      >
                        {getEventIcon(activity.event)}
                        {activity.event}
                      </span>
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/nft/${activity.nftId}`}
                        className="flex items-center gap-2 hover:text-primary"
                      >
                        <OptimizedImage
                          src={activity.nftImageUrl ? ipfsToHttp(activity.nftImageUrl) : ''}
                          alt={activity.nftName}
                          variant="card"
                          className="h-8 w-8 rounded"
                        />
                        <span className="text-sm font-medium text-foreground">
                          {activity.nftName}
                        </span>
                      </Link>
                    </td>
                    <td className="py-4 text-sm font-medium text-foreground">
                      {activity.price
                        ? `${formatWLC(activity.price)} WLC`
                        : '--'}
                    </td>
                    <td className="py-4">
                      {activity.from ? (
                        <Link
                          href={`/profile/${activity.from}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {shortenAddress(activity.from)}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          --
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      {activity.to ? (
                        <Link
                          href={`/profile/${activity.to}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {shortenAddress(activity.to)}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          --
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {timeAgo(activity.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      getEventStyle(activity.event),
                    )}
                  >
                    {getEventIcon(activity.event)}
                    {activity.event}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(activity.timestamp)}
                  </span>
                </div>

                <Link
                  href={`/nft/${activity.nftId}`}
                  className="mb-2 flex items-center gap-2"
                >
                  <OptimizedImage
                    src={activity.nftImageUrl ? ipfsToHttp(activity.nftImageUrl) : ''}
                    alt={activity.nftName}
                    variant="card"
                    className="h-10 w-10 rounded"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {activity.nftName}
                  </span>
                </Link>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Price</span>
                    <p className="font-medium text-foreground">
                      {activity.price
                        ? `${formatWLC(activity.price)} WLC`
                        : '--'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">From</span>
                    <p>
                      {activity.from ? (
                        <Link
                          href={`/profile/${activity.from}`}
                          className="text-primary hover:underline"
                        >
                          {shortenAddress(activity.from)}
                        </Link>
                      ) : (
                        '--'
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">To</span>
                    <p>
                      {activity.to ? (
                        <Link
                          href={`/profile/${activity.to}`}
                          className="text-primary hover:underline"
                        >
                          {shortenAddress(activity.to)}
                        </Link>
                      ) : (
                        '--'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
