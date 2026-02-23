'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';
import { StatsCards } from '@/components/admin/StatsCards';
import { api } from '@/lib/api';

interface ReportSummary {
  id: string;
  targetType: 'COLLECTION' | 'NFT';
  targetId: string;
  category: 'SCAM' | 'COPYRIGHT' | 'INAPPROPRIATE';
  reporterAddress: string;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED';
  createdAt: string;
}

interface ReportsResponse {
  data: ReportSummary[];
  total: number;
}

const categoryLabels: Record<string, string> = {
  SCAM: 'Scam',
  COPYRIGHT: 'Copyright',
  INAPPROPRIATE: 'Inappropriate',
};

/**
 * Admin Dashboard Page - /admin
 *
 * Shows StatsCards and recent pending reports mini table.
 * Auto-refreshes every 30 seconds.
 */
export default function AdminDashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchRecentReports = useCallback(async () => {
    try {
      const res = await api.get<ReportsResponse>('/admin/reports', {
        params: { status: 'PENDING', limit: 5, page: 1 },
      });
      setReports(res.data);
    } catch {
      // API may not be ready
    }
  }, []);

  useEffect(() => {
    fetchRecentReports();
  }, [fetchRecentReports, refreshKey]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const truncateAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-';

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* Stats Cards - key forces re-mount on refresh */}
      <StatsCards key={refreshKey} />

      {/* Recent Pending Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Pending Reports
          </h2>
          <button
            onClick={() => router.push('/admin/reports')}
            className="text-sm text-primary hover:underline"
          >
            View All
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
            <Flag className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No pending reports
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Target</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    Reporter
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => router.push('/admin/reports')}
                    className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm">
                      <span className="text-foreground font-medium">
                        {report.targetType === 'COLLECTION'
                          ? 'Collection'
                          : 'NFT'}
                      </span>
                      <span className="text-muted-foreground ml-1 text-xs">
                        {report.targetId.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {categoryLabels[report.category] || report.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                      {truncateAddress(report.reporterAddress)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {new Date(report.createdAt).toLocaleDateString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
