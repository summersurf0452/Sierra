'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { SearchResults } from '@/types/nft';

/**
 * useSearch: Debounced search hook with AbortController
 *
 * Features:
 * - 300ms debounce to prevent excessive API calls
 * - AbortController to cancel in-flight requests
 * - Minimum 2 character query requirement
 * - Cleanup on unmount (clear timeout + abort)
 *
 * Usage:
 *   const { query, results, isLoading, search, setQuery, setResults } = useSearch();
 *   <input onChange={(e) => search(e.target.value)} />
 */
export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);

    // Clear existing timeout and abort pending request
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    // Minimum 2 characters to trigger search
    if (q.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    // Set 300ms debounce
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const res = await api.get<SearchResults>(
          `/search?q=${encodeURIComponent(q)}&limit=5`,
          { signal: controller.signal },
        );
        setResults(res);
      } catch (e: unknown) {
        // Ignore AbortError (expected when user types fast)
        if (e instanceof DOMException && e.name === 'AbortError') return;
        // Clear results on other errors
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { query, results, isLoading, search, setQuery, setResults };
}
