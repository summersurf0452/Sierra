'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ReportTable, AdminReport } from '@/components/admin/ReportTable';
import { api } from '@/lib/api';

type FilterStatus = 'ALL' | 'PENDING' | 'REVIEWED' | 'DISMISSED';

interface ReportsResponse {
  data: AdminReport[];
  total: number;
}

const filterTabs: { value: FilterStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

/**
 * Admin Reports Page - /admin/reports
 *
 * Lists all reports with status filter tabs and review/dismiss actions.
 * API calls: GET /admin/reports, PATCH /admin/reports/:id/review.
 */
export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('ALL');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: 1,
        limit: 50,
      };
      if (filter !== 'ALL') {
        params.status = filter;
      }
      const res = await api.get<ReportsResponse>('/admin/reports', { params });
      setReports(res.data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReview = async (
    id: string,
    status: 'REVIEWED' | 'DISMISSED',
  ) => {
    try {
      await api.patch(`/admin/reports/${id}/review`, { status });
      if (status === 'REVIEWED') {
        toast.success('Report has been reviewed');
      } else {
        toast.success('Report has been dismissed');
      }
      fetchReports();
    } catch {
      toast.error('Failed to process report');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Report Management</h1>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ReportTable
        reports={reports}
        onReview={handleReview}
        loading={loading}
      />
    </div>
  );
}
