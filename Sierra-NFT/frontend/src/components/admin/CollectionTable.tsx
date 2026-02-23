'use client';

import { ShieldCheck, ShieldOff, Eye, EyeOff } from 'lucide-react';
import { Collection } from '@/types/nft';

interface CollectionTableProps {
  collections: Collection[];
  onVerify: (id: string) => void;
  onUnverify: (id: string) => void;
  onHide: (id: string) => void;
  onUnhide: (id: string) => void;
  loading?: boolean;
}

/**
 * CollectionTable - Admin collection management table
 *
 * Displays collections with verify/unverify and hide/unhide toggle buttons.
 * Responsive: table on desktop, card layout on mobile.
 */
export function CollectionTable({
  collections,
  onVerify,
  onUnverify,
  onHide,
  onUnhide,
  loading,
}: CollectionTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-4 animate-pulse"
          >
            <div className="h-4 bg-muted rounded w-48 mb-2" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
        No collections found
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Creator</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-left px-4 py-3 font-medium">Verified</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Reports</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((col) => (
              <tr
                key={col.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {col.name}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {col.creator.slice(0, 6)}...{col.creator.slice(-4)}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {col.contractType}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {col.category || '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {col.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-blue-500">
                      <ShieldCheck className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unverified</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {col.isHidden ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive rounded text-xs font-medium">
                      Hidden
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Visible</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {col.reportCount}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {col.isVerified ? (
                      <button
                        onClick={() => onUnverify(col.id)}
                        title="Unverify"
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-orange-500"
                      >
                        <ShieldOff className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onVerify(col.id)}
                        title="Verify"
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-blue-500"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                    {col.isHidden ? (
                      <button
                        onClick={() => onUnhide(col.id)}
                        title="Unhide"
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-green-500"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onHide(col.id)}
                        title="Hide"
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {collections.map((col) => (
          <div
            key={col.id}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-foreground">{col.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {col.creator.slice(0, 6)}...{col.creator.slice(-4)} | {col.contractType}
                </p>
              </div>
              <div className="flex gap-1">
                {col.isVerified ? (
                  <button
                    onClick={() => onUnverify(col.id)}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-blue-500"
                  >
                    <ShieldOff className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onVerify(col.id)}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                )}
                {col.isHidden ? (
                  <button
                    onClick={() => onUnhide(col.id)}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-green-500"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onHide(col.id)}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {col.isVerified ? (
                <span className="text-blue-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="text-muted-foreground">Unverified</span>
              )}
              {col.isHidden && (
                <span className="px-1.5 py-0.5 bg-destructive/10 text-destructive rounded text-xs">
                  Hidden
                </span>
              )}
              <span className="text-muted-foreground">
                {col.reportCount} report(s)
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
