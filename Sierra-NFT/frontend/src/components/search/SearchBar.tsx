'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { SearchDropdown } from './SearchDropdown';

/**
 * SearchBar: Navbar-integrated search input with dropdown trigger
 *
 * Features:
 * - Search icon + input field with dark theme styling
 * - Debounced search via useSearch hook
 * - Dropdown shows on results (collections + NFTs)
 * - Enter navigates to /search?q=... full results page
 * - Escape closes dropdown and blurs input
 * - Click outside closes dropdown
 * - Route change closes dropdown (per pitfall #3)
 * - Hidden on mobile (hidden md:flex), responsive width (w-64 lg:w-96)
 */
export function SearchBar() {
  const { query, results, isLoading, search, setQuery, setResults } = useSearch();
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on route change (per pitfall #3)
  useEffect(() => {
    setResults(null);
  }, [pathname, setResults]);

  // Click outside to close dropdown
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setResults(null);
      }
    },
    [setResults],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setResults(null);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === 'Escape') {
      setResults(null);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="flex w-64 items-center rounded-lg border border-border bg-muted/50 px-3 py-2 lg:w-96">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search NFTs, collections..."
          value={query}
          onChange={(e) => search(e.target.value)}
          onKeyDown={handleKeyDown}
          className="ml-2 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {results !== null && (
        <SearchDropdown
          results={results}
          query={query}
          onSelect={() => setResults(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

/**
 * MobileSearchBar: Full-width search bar for mobile menu
 */
export function MobileSearchBar() {
  const { query, results, isLoading, search, setQuery, setResults } = useSearch();
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setResults(null);
  }, [pathname, setResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setResults(null);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === 'Escape') {
      setResults(null);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex w-full items-center rounded-lg border border-border bg-muted/50 px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search NFTs, collections..."
          value={query}
          onChange={(e) => search(e.target.value)}
          onKeyDown={handleKeyDown}
          className="ml-2 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {results !== null && (
        <SearchDropdown
          results={results}
          query={query}
          onSelect={() => setResults(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
