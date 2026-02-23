/**
 * VerifiedBadge - Blue shield check icon for verified collections
 *
 * Displays next to collection names across the app:
 * NFTCard, CollectionHeader, SearchDropdown, search page, homepage
 */

import { ShieldCheck } from 'lucide-react';

const sizeMap = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerifiedBadge({ size = 'md', className }: VerifiedBadgeProps) {
  return (
    <span title="Verified Collection" className="inline-flex">
      <ShieldCheck
        className={`${sizeMap[size]} text-blue-500 fill-blue-500/20 flex-shrink-0 ${className ?? ''}`}
        aria-label="Verified collection"
      />
    </span>
  );
}
