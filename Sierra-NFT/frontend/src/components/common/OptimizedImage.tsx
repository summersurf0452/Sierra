'use client';

import { useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { cn, getOptimizedImageUrl } from '@/lib/utils';

/**
 * OptimizedImage - Reusable image component
 *
 * Features:
 * - 4 variants: card(~300px), detail(1200px), cover(800px), avatar(200px)
 * - Automatic Pinata Dedicated Gateway image optimization
 * - Shimmer skeleton loading state
 * - First-letter + gradient fallback on error
 * - Smooth image transition via opacity
 */

type ImageVariant = 'card' | 'detail' | 'cover' | 'avatar';

interface OptimizedImageProps {
  src: string;
  alt: string;
  variant: ImageVariant;
  className?: string;
  objectFit?: 'cover' | 'contain';
}

const VARIANT_CONFIG: Record<ImageVariant, { width: number; quality: number }> = {
  card: { width: 300, quality: 80 },
  detail: { width: 1200, quality: 90 },
  cover: { width: 800, quality: 85 },
  avatar: { width: 200, quality: 80 },
};

export function OptimizedImage({ src, alt, variant, className, objectFit = 'cover' }: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const config = VARIANT_CONFIG[variant];
  const optimizedUrl = src ? getOptimizedImageUrl(src, config) : '';

  // Fallback when error or no src
  if (!optimizedUrl || error) {
    const initial = alt?.[0]?.toUpperCase() || '?';
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted',
          className,
        )}
      >
        <span className="text-4xl font-bold text-muted-foreground/40">
          {initial}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Skeleton (loading) */}
      {!loaded && (
        <div className="absolute inset-0">
          <Skeleton
            width="100%"
            height="100%"
            baseColor="hsl(var(--muted))"
            highlightColor="hsl(var(--accent))"
            borderRadius={0}
          />
        </div>
      )}

      {/* Image */}
      <img
        src={optimizedUrl}
        alt={alt}
        className={cn(
          'h-full w-full transition-opacity duration-300',
          objectFit === 'contain' ? 'object-contain' : 'object-cover',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
