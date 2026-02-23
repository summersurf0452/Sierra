'use client';

import { CheckCircle, XCircle } from 'lucide-react';

export interface AdminReport {
  id: string;
  targetType: 'COLLECTION' | 'NFT';
  targetId: string;
  category: 'SCAM' | 'COPYRIGHT' | 'INAPPROPRIATE';
  reporterAddress: string;
  description: string | null;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED';
  createdAt: string;
}

interface ReportTableProps {
  reports: AdminReport[];
  onReview: (id: string, status: 'REVIEWED' | 'DISMISSED') => void;
  loading?: boolean;
}

const categoryConfig: Record<
  string,
  { label: string; className: string }
> = {
  SCAM: { label: 'Scam', className: 'bg-red-500/10 text-red-500' },
  COPYRIGHT: { label: 'Copyright', className: 'bg-orange-500/10 text-orange-500' },
  INAPPROPRIATE: {
    label: 'Inappropriate',
    className: 'bg-purple-500/10 text-purple-500',
  },
};

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-500' },
  REVIEWED: {
    label: 'Reviewed',
    className: 'bg-green-500/10 text-green-500',
  },
  DISMISSED: { label: 'Dismissed', className: 'bg-zinc-500/10 text-zinc-400' },
};

/**
 * ReportTable - Admin report management table
 *
 * Displays reports with category badges, status badges, and review actions.
 * Responsive: table on desktop, card layout on mobile.
 */
export function ReportTable({ reports, onReview, loading }: ReportTableProps) {
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

  if (reports.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
        No reports found
      </div>
    );
  }

  const truncateAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-';

  const getTargetUrl = (report: AdminReport) => {
    if (report.targetType === 'COLLECTION') {
      return `/collections/${report.targetId}`;
    }
    return `/nft/${report.targetId}`;
  };

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Target Type</th>
              <th className="text-left px-4 py-3 font-medium">Target ID</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-left px-4 py-3 font-medium">Reporter</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const cat = categoryConfig[report.category] || {
                label: report.category,
                className: 'bg-muted text-foreground',
              };
              const stat = statusConfig[report.status] || {
                label: report.status,
                className: 'bg-muted text-foreground',
              };

              return (
                <tr
                  key={report.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-foreground">
                    {report.targetType === 'COLLECTION' ? 'Collection' : 'NFT'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <a
                      href={getTargetUrl(report)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {report.targetId.slice(0, 8)}...
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cat.className}`}
                    >
                      {cat.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {truncateAddress(report.reporterAddress)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${stat.className}`}
                    >
                      {stat.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-4 py-3">
                    {report.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onReview(report.id, 'REVIEWED')}
                          title="Mark as Reviewed"
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-green-500"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onReview(report.id, 'DISMISSED')}
                          title="Dismiss"
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-zinc-400"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-muted-foreground">
                        {stat.label}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {reports.map((report) => {
          const cat = categoryConfig[report.category] || {
            label: report.category,
            className: 'bg-muted text-foreground',
          };
          const stat = statusConfig[report.status] || {
            label: report.status,
            className: 'bg-muted text-foreground',
          };

          return (
            <div
              key={report.id}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {report.targetType === 'COLLECTION'
                        ? 'Collection'
                        : 'NFT'}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cat.className}`}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <a
                    href={getTargetUrl(report)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {report.targetId.slice(0, 8)}...
                  </a>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${stat.className}`}
                >
                  {stat.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {truncateAddress(report.reporterAddress)} |{' '}
                  {new Date(report.createdAt).toLocaleDateString('en-US')}
                </div>
                {report.status === 'PENDING' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onReview(report.id, 'REVIEWED')}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-green-500"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onReview(report.id, 'DISMISSED')}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-zinc-400"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
