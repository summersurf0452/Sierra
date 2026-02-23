'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, TrendingUp, Clock, Zap, Shield, Layers } from 'lucide-react';
import { NFTGrid } from '@/components/nft/NFTGrid';
import { api } from '@/lib/api';
import { NFT, CollectionWithStats } from '@/types/nft';
import { formatWLC, ipfsToHttp } from '@/lib/utils';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { OptimizedImage } from '@/components/common/OptimizedImage';

/**
 * Home Page: Landing page for Sierra NFT Marketplace
 *
 * Design: Mint/Black/DarkGreen brand identity
 * Features:
 * - Hero section with brand gradient + noise overlay
 * - Trending collections with hover glow cards
 * - Latest listings with NFT grid
 * - Features section with icon cards
 */
export default function Home() {
  const { data: featuredCollections } = useQuery({
    queryKey: ['featured-collection'],
    queryFn: () =>
      api.get<CollectionWithStats[]>('/collections/trending?limit=1'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const {
    data: trendingCollections,
    isLoading: trendingLoading,
  } = useQuery({
    queryKey: ['trending-collections'],
    queryFn: () =>
      api.get<CollectionWithStats[]>('/collections/trending?limit=8'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const {
    data: latestListingsData,
    isLoading: listingsLoading,
  } = useQuery({
    queryKey: ['latest-listings'],
    queryFn: () =>
      api.get<{ data: any[]; total: number }>(
        '/listings?limit=12&sort=newest',
      ),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const featured = featuredCollections?.[0] || null;
  const trending = trendingCollections || [];
  const latestNfts: NFT[] = (latestListingsData?.data || [])
    .map((listing: any) => listing.nft)
    .filter((nft: any): nft is NFT => nft != null);

  return (
    <div className="relative">
      {/* ===== Hero Section — always shows banner.png ===== */}
      <section className="relative overflow-hidden">
        <div className="relative">
          {/* Banner Background (always visible) */}
          <div className="relative h-[480px] w-full sm:h-[540px] overflow-hidden">
            <Image
              src="/banner.png"
              alt="Sierra NFT Marketplace"
              width={1920}
              height={1080}
              className="h-full w-full object-cover"
              priority
            />
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent" />
          </div>

          {/* Content overlay */}
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto max-w-7xl w-full px-4 pb-10 sm:px-6 lg:px-8">
              {featured ? (
                /* Featured collection info */
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="float-up">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                      ★ Featured Collection
                    </p>
                    <h1 className="font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl drop-shadow-lg">
                      {featured.name}
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-6">
                      {featured.floorPrice && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Floor Price</p>
                          <p className="text-lg font-semibold text-white">
                            {formatWLC(featured.floorPrice)} <span className="text-sm text-primary">WLC</span>
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/50">Total Volume</p>
                        <p className="text-lg font-semibold text-white">
                          {featured.totalVolume && featured.totalVolume !== '0'
                            ? <>{formatWLC(featured.totalVolume)} <span className="text-sm text-primary">WLC</span></>
                            : 'N/A'}
                        </p>
                      </div>
                      {featured.totalSupply != null && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Items</p>
                          <p className="text-lg font-semibold text-white">{featured.totalSupply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/collections/${featured.id}`}
                    className="sierra-btn-primary inline-flex items-center gap-2 text-sm"
                  >
                    View Collection
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                /* Default branding content */
                <div className="max-w-2xl">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl float-up">
                    <span className="block">WorldLand</span>
                    <span className="mt-1 block sierra-gradient-text">NFT Marketplace</span>
                  </h1>
                  <p className="mt-4 max-w-xl text-base text-white/70 float-up" style={{ animationDelay: '0.1s' }}>
                    Discover, create, and trade NFTs on the WorldLand blockchain.
                  </p>
                  <div className="mt-8 flex items-center gap-4 float-up" style={{ animationDelay: '0.2s' }}>
                    <Link href="/explore" className="sierra-btn-primary text-sm">Explore NFTs</Link>
                    <Link href="/collections/create" className="sierra-btn-secondary text-sm !border-white/20 !text-white hover:!bg-white/10">Create Collection</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Trending Collections Section ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                Trending Collections
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Explore the most popular collections
              </p>
            </div>
          </div>
          <Link
            href="/explore"
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`trending-skel-${i}`}
                className="sierra-card overflow-hidden"
              >
                <div className="aspect-[3/2] animate-pulse bg-muted" />
                <div className="p-4">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="mt-3 flex justify-between">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : trending.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trending.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="group sierra-card overflow-hidden"
              >
                {/* Cover Image */}
                <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-br from-primary/10 to-sierra-green/10">
                  <OptimizedImage
                    src={collection.coverImageUrl ? ipfsToHttp(collection.coverImageUrl) : ''}
                    alt={collection.name}
                    variant="card"
                    className="h-full w-full transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>

                {/* Info */}
                <div className="p-3 sm:p-4">
                  <h3 className="flex items-center gap-1 truncate text-sm font-semibold text-foreground sm:text-base">
                    {collection.name}
                    {collection?.isVerified && <VerifiedBadge size="sm" />}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider">
                        Floor
                      </span>
                      <span className="font-medium text-foreground">
                        {collection.floorPrice
                          ? `${formatWLC(collection.floorPrice)} WLC`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase tracking-wider">
                        Volume
                      </span>
                      <span className="font-medium text-foreground">
                        {collection.totalVolume &&
                        collection.totalVolume !== '0'
                          ? `${formatWLC(collection.totalVolume)} WLC`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Layers className="h-6 w-6 text-primary/50" />
              </div>
              <p className="text-muted-foreground">
                New collections will appear here
              </p>
              <Link
                href="/collections/create"
                className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary/80"
              >
                Create a Collection →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ===== Latest Listings Section ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                Latest Listings
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Check out the newest NFTs on the market
              </p>
            </div>
          </div>
          <Link
            href="/explore"
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <NFTGrid
          nfts={latestNfts}
          loading={listingsLoading}
          emptyMessage="No NFTs listed yet"
        />
      </section>

      {/* ===== Features Section ===== */}
      <section className="border-t border-border/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-center font-display text-3xl font-bold text-foreground">
            Why <span className="sierra-gradient-text">Sierra</span>
          </h2>
          <p className="mb-14 text-center text-muted-foreground max-w-md mx-auto">
            Built on WorldLand blockchain for fast, low-cost, and secure NFT trading
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Layers,
                title: 'Multi-Standard NFTs',
                description: 'Mint both ERC-721 unique pieces and ERC-1155 editions in one marketplace',
              },
              {
                icon: Zap,
                title: 'Instant Trading',
                description: 'Buy and sell NFTs with near-instant finality and minimal gas fees on WLC',
              },
              {
                icon: Shield,
                title: 'Secure & Verified',
                description: 'Smart contract verified collections with on-chain royalty enforcement',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="sierra-card p-6 group"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
