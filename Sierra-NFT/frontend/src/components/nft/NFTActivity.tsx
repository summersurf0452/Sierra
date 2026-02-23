/**
 * NFTActivity - Activity section for NFT detail page
 *
 * Shows complete transaction history for a single NFT.
 * Fetches from GET /nfts/:id/activity endpoint.
 *
 * Features:
 * - Event type filter buttons (All | Mint | List | Sale | Cancel | Transfer)
 * - Desktop table layout (Event | Price | From | To | Time)
 * - Mobile card layout
 * - Colored event badges with icons
 * - Truncated addresses linked to profiles
 * - Relative time display
 * - Skeleton loading and empty states
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Paintbrush,
  Tag,
  ShoppingCart,
  XCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ActivityItem } from '@/types/nft';
import { formatWLC, shortenAddress, cn } from '@/lib/utils';

interface NFTActivityProps {
  nftId: string;
}

const EVENT_FILTERS = [
  { value: '', label: 'All' },
  { value: 'Mint', label: 'Mint' },
  { value: 'List', label: 'List' },
  { value: 'Sale', label: 'Sale' },
  { value: 'Cancel', label: 'Cancel' },
  { value: 'Transfer', label: 'Transfer' },
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

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'Mint':
      return <Paintbrush className="h-3.5 w-3.5" />;
    case 'List':
      return <Tag className="h-3.5 w-3.5" />;
    case 'Sale':
      return <ShoppingCart className="h-3.5 w-3.5" />;
    case 'Cancel':
      return <XCircle className="h-3.5 w-3.5" />;
    case 'Transfer':
      return <ArrowRightLeft className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function getEventStyle(eventType: string) {
  switch (eventType) {
    case 'Mint':
      return 'bg-orange-500/10 text-orange-500';
    case 'List':
      return 'bg-blue-500/10 text-blue-500';
    case 'Sale':
      return 'bg-green-500/10 text-green-500';
    case 'Cancel':
      return 'bg-gray-500/10 text-gray-400';
    case 'Transfer':
      return 'bg-purple-500/10 text-purple-500';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function AddressLink({ address }: { address: string | null }) {
  if (!address) {
    return <span className="text-sm text-muted-foreground">--</span>;
  }
  return (
    <Link
      href={`/profile/${address}`}
      className="text-sm text-primary hover:underline"
    >
      {shortenAddress(address)}
    </Link>
  );
}

export function NFTActivity({ nftId }: NFTActivityProps) {
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['nft-activity', nftId, eventTypeFilter],
    queryFn: () =>
      api.get<{ data: ActivityItem[]; total: number }>(
        `/nfts/${nftId}/activity?${eventTypeFilter ? 'eventType=' + eventTypeFilter + '&' : ''}limit=50`,
      ),
    enabled: !!nftId,
  });

  const activities = data?.data || [];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Filter skeleton */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-16 animate-pulse rounded-full bg-muted"
            />
          ))}
        </div>
        {/* Table skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-muted"
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
            onClick={() => setEventTypeFilter(filter.value)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              eventTypeFilter === filter.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {activities.length === 0 ? (
        <div className="flex min-h-[150px] items-center justify-center">
          <p className="text-muted-foreground">
            No activity yet for this NFT
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
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">From</th>
                  <th className="pb-3 font-medium">To</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr
                    key={activity.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                          getEventStyle(activity.eventType),
                        )}
                      >
                        {getEventIcon(activity.eventType)}
                        {activity.eventType}
                      </span>
                    </td>
                    <td className="py-4 text-sm font-medium text-foreground">
                      {activity.price
                        ? `${formatWLC(activity.price)} WLC`
                        : '--'}
                    </td>
                    <td className="py-4">
                      <AddressLink address={activity.from} />
                    </td>
                    <td className="py-4">
                      <AddressLink address={activity.to} />
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
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      getEventStyle(activity.eventType),
                    )}
                  >
                    {getEventIcon(activity.eventType)}
                    {activity.eventType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(activity.timestamp)}
                  </span>
                </div>

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
                      <AddressLink address={activity.from} />
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">To</span>
                    <p>
                      <AddressLink address={activity.to} />
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
