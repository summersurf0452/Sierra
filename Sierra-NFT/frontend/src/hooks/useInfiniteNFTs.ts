/**
 * useInfiniteNFTs - Infinite scroll data loading for NFT grids
 *
 * Uses react-intersection-observer to detect when the user scrolls
 * near the bottom of the grid, then loads the next page of NFTs.
 * Deduplicates NFTs by ID to prevent duplicate items from offset pagination.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { api } from '@/lib/api';
import { NFT } from '@/types/nft';

interface UseInfiniteNFTsOptions {
  /** Base endpoint for fetching NFTs (default: '/nfts') */
  endpoint?: string;
  /** Query parameters to include in every request */
  params?: Record<string, string>;
  /** Number of items per page (default: 20) */
  limit?: number;
  /** Whether to start fetching immediately (default: true) */
  enabled?: boolean;
}

interface UseInfiniteNFTsReturn {
  nfts: NFT[];
  loading: boolean;
  hasMore: boolean;
  total: number;
  sentinelRef: (node?: Element | null) => void;
  reset: () => void;
}

export function useInfiniteNFTs({
  endpoint = '/nfts',
  params = {},
  limit = 20,
  enabled = true,
}: UseInfiniteNFTsOptions = {}): UseInfiniteNFTsReturn {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Track seen IDs for deduplication
  const seenIdsRef = useRef<Set<string>>(new Set());
  // Track current params for reset detection
  const paramsKeyRef = useRef<string>('');

  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  // Serialize params for comparison
  const paramsKey = JSON.stringify(params);

  // Reset when params change
  useEffect(() => {
    if (paramsKeyRef.current !== paramsKey) {
      paramsKeyRef.current = paramsKey;
      setNfts([]);
      setPage(1);
      setHasMore(true);
      setTotal(0);
      seenIdsRef.current.clear();
    }
  }, [paramsKey]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !enabled) return;

    setLoading(true);
    try {
      const queryStr = new URLSearchParams({
        ...params,
        page: String(page),
        limit: String(limit),
      }).toString();

      const res = await api.get<{ data: NFT[]; total: number }>(
        `${endpoint}?${queryStr}`,
      );

      // Deduplicate by ID
      const newNfts = (res.data || []).filter((nft) => {
        if (seenIdsRef.current.has(nft.id)) return false;
        seenIdsRef.current.add(nft.id);
        return true;
      });

      setNfts((prev) => [...prev, ...newNfts]);
      setTotal(res.total);

      const totalLoaded = page * limit;
      setHasMore(totalLoaded < res.total);
      setPage((p) => p + 1);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, enabled, params, page, limit, endpoint]);

  // Load next page when sentinel enters viewport
  useEffect(() => {
    if (inView && hasMore && !loading && enabled) {
      loadMore();
    }
  }, [inView, hasMore, loading, enabled, loadMore]);

  // Initial load
  useEffect(() => {
    if (enabled && nfts.length === 0 && hasMore && !loading) {
      loadMore();
    }
  }, [enabled, paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    setNfts([]);
    setPage(1);
    setHasMore(true);
    setTotal(0);
    seenIdsRef.current.clear();
  }, []);

  return { nfts, loading, hasMore, total, sentinelRef, reset };
}
