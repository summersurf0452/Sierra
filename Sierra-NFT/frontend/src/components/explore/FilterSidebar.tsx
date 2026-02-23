'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  status: 'all' | 'listed' | 'unlisted';
  category: string; // CollectionCategory value or 'all'
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'popularity';
}

interface FilterSidebarProps {
  onApply: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
  className?: string;
}

const DEFAULT_FILTERS: FilterState = {
  minPrice: '',
  maxPrice: '',
  status: 'all',
  category: 'all',
  sortBy: 'newest',
};

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'Art', label: 'Art' },
  { value: 'Photography', label: 'Photography' },
  { value: 'Music', label: 'Music' },
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Collectibles', label: 'Collectibles' },
  { value: 'Other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'listed', label: 'On Sale' },
  { value: 'unlisted', label: 'Not Listed' },
];

function FilterContent({
  filters,
  setFilters,
  onApply,
  onClear,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Price Range (WLC)
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) =>
              setFilters((f) => ({ ...f, minPrice: e.target.value }))
            }
            min="0"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <span className="flex items-center text-sm text-muted-foreground">
            -
          </span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) =>
              setFilters((f) => ({ ...f, maxPrice: e.target.value }))
            }
            min="0"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Status</h3>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2"
            >
              <input
                type="radio"
                name="status"
                checked={filters.status === opt.value}
                onChange={() =>
                  setFilters((f) => ({
                    ...f,
                    status: opt.value as FilterState['status'],
                  }))
                }
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm text-foreground">{opt.label}</span>
            </label>
          ))}
          {/* Auction - Coming Soon */}
          <label className="flex cursor-not-allowed items-center gap-2 opacity-50">
            <input type="radio" name="status" disabled className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">
              Auction (Coming Soon)
            </span>
          </label>
        </div>
      </div>

      {/* Category */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Category</h3>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <label
              key={cat.value}
              className="flex cursor-pointer items-center gap-2"
            >
              <input
                type="radio"
                name="category"
                checked={filters.category === cat.value}
                onChange={() =>
                  setFilters((f) => ({ ...f, category: cat.value }))
                }
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm text-foreground">{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Sort By</h3>
        <select
          value={filters.sortBy}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              sortBy: e.target.value as FilterState['sortBy'],
            }))
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="popularity">Most Popular</option>
        </select>
      </div>

      {/* Apply Button */}
      <button
        onClick={onApply}
        className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Apply Filters
      </button>

      {/* Clear Filters */}
      <button
        onClick={onClear}
        className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Clear Filters
      </button>
    </div>
  );
}

export function FilterSidebar({
  onApply,
  initialFilters,
  className,
}: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleApply = () => {
    onApply(filters);
    setMobileOpen(false);
  };

  const handleClear = () => {
    const cleared = { ...DEFAULT_FILTERS };
    setFilters(cleared);
    onApply(cleared);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden w-64 shrink-0 space-y-6 border-r border-border pr-6 md:block ${className || ''}`}
      >
        <FilterContent
          filters={filters}
          setFilters={setFilters}
          onApply={handleApply}
          onClear={handleClear}
        />
      </aside>

      {/* Mobile: Floating Filter Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 md:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filter
      </button>

      {/* Mobile: Bottom Sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background p-6 shadow-xl animate-in slide-in-from-bottom">
            {/* Close Button */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Filters</h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FilterContent
              filters={filters}
              setFilters={setFilters}
              onApply={handleApply}
              onClear={handleClear}
            />
          </div>
        </div>
      )}
    </>
  );
}
