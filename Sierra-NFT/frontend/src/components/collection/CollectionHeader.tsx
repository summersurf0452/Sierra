/**
 * CollectionHeader - Full-width cover image + stats bar for collection detail page
 *
 * Layout (OpenSea/Blur convention):
 * - Cover image (full-width, gradient fallback)
 * - Collection info overlay (avatar, name, creator, category badge)
 * - Stats bar: Floor Price | Total Volume | Items | Owners
 * - Description with "Show more" toggle
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CollectionWithStats } from '@/types/nft';
import { formatWLC, shortenAddress, ipfsToHttp } from '@/lib/utils';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { OptimizedImage } from '@/components/common/OptimizedImage';

interface CollectionHeaderProps {
  collection: CollectionWithStats;
}

export function CollectionHeader({ collection }: CollectionHeaderProps) {
  const [showFullDesc, setShowFullDesc] = useState(false);

  const stats = [
    {
      label: 'Floor Price',
      value: collection.floorPrice
        ? `${formatWLC(collection.floorPrice)} WLC`
        : '--',
    },
    {
      label: 'Total Volume',
      value: collection.totalVolume
        ? `${formatWLC(collection.totalVolume)} WLC`
        : '0 WLC',
    },
    {
      label: 'Items',
      value: String(collection.totalSupply ?? 0),
    },
    {
      label: 'Owners',
      value: String(collection.ownerCount ?? 0),
    },
  ];

  return (
    <div className="w-full">
      {/* Cover Image */}
      <div className="relative h-48 w-full overflow-hidden rounded-t-lg sm:h-64 lg:h-80">
        <OptimizedImage
          src={collection.coverImageUrl ? ipfsToHttp(collection.coverImageUrl) : ''}
          alt={`${collection.name} cover`}
          variant="cover"
          className="h-full w-full"
        />
      </div>

      {/* Collection Info */}
      <div className="px-4 sm:px-6">
        {/* Avatar */}
        <div className="-mt-12 relative mb-4">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-gradient-to-br from-primary/50 to-primary/20 text-3xl font-bold text-primary-foreground shadow-lg">
            {collection.name?.[0]?.toUpperCase() || '?'}
          </div>
        </div>

        {/* Name & Creator */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">
              {collection.name}
            </h1>
            {collection?.isVerified && <VerifiedBadge size="lg" />}
          </div>
          {!collection?.isVerified && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              This collection is not verified
            </p>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">by</span>
            <Link
              href={`/profile/${collection.creator}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {shortenAddress(collection.creator)}
            </Link>
          </div>

          {/* Category Badge */}
          {collection.category && collection.category !== 'Other' && (
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {collection.category}
            </span>
          )}
        </div>

        {/* Stats Bar */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border p-4"
            >
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Description */}
        {collection.description && (
          <div className="mb-4">
            <p
              className={`text-sm text-muted-foreground ${
                showFullDesc ? '' : 'line-clamp-3'
              }`}
            >
              {collection.description}
            </p>
            {collection.description.length > 200 && (
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="mt-1 text-sm font-medium text-primary hover:underline"
              >
                {showFullDesc ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
