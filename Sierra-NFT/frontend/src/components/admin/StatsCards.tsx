'use client';

import { useEffect, useState } from 'react';
import { Layers, Image, Flag, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface AdminStats {
  collections: { total: number; verified: number; hidden: number };
  nfts: { total: number; hidden: number };
  reports: { total: number; pending: number };
  recent24h: { newCollections: number; newReports: number };
}

interface StatCard {
  title: string;
  icon: typeof Layers;
  accentColor: string;
  values: { label: string; value: number }[];
}

/**
 * StatsCards - Admin dashboard statistics cards
 *
 * Displays 4 stat cards: Collections, NFTs, Reports, Recent 24h.
 * Fetches data from GET /admin/stats.
 */
export function StatsCards() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get<AdminStats>('/admin/stats');
        setStats(data);
      } catch {
        // Stats may fail if endpoint not ready
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-6 animate-pulse"
          >
            <div className="h-4 bg-muted rounded w-20 mb-4" />
            <div className="h-8 bg-muted rounded w-16 mb-2" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-muted-foreground text-sm">
        Unable to load statistics.
      </div>
    );
  }

  const cards: StatCard[] = [
    {
      title: 'Collections',
      icon: Layers,
      accentColor: 'text-blue-500',
      values: [
        { label: 'Total', value: stats.collections.total },
        { label: 'Verified', value: stats.collections.verified },
        { label: 'Hidden', value: stats.collections.hidden },
      ],
    },
    {
      title: 'NFTs',
      icon: Image,
      accentColor: 'text-purple-500',
      values: [
        { label: 'Total', value: stats.nfts.total },
        { label: 'Hidden', value: stats.nfts.hidden },
      ],
    },
    {
      title: 'Reports',
      icon: Flag,
      accentColor: 'text-red-500',
      values: [
        { label: 'Total', value: stats.reports.total },
        { label: 'Pending', value: stats.reports.pending },
      ],
    },
    {
      title: 'Last 24 Hours',
      icon: Clock,
      accentColor: 'text-green-500',
      values: [
        { label: 'New Collections', value: stats.recent24h.newCollections },
        { label: 'New Reports', value: stats.recent24h.newReports },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const mainValue = card.values[0];
        return (
          <div
            key={card.title}
            className="bg-card border border-border rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">
                {card.title}
              </span>
              <Icon className={`w-5 h-5 ${card.accentColor}`} />
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">
              {(mainValue.value ?? 0).toLocaleString()}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              {card.values.slice(1).map((v) => (
                <span key={v.label}>
                  {v.label}: <span className="text-foreground">{v.value}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
