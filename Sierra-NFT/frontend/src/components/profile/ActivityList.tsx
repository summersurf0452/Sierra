'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Tag, Paintbrush, XCircle } from 'lucide-react';
import { formatWLC, shortenAddress } from '@/lib/utils';
import { api } from '@/lib/api';

interface Activity {
  id: string;
  type: 'LISTED' | 'SOLD' | 'BOUGHT' | 'CANCELED' | 'MINTED';
  nftId: string;
  nftName: string | null;
  collectionName: string | null;
  price?: string;
  from?: string;
  to?: string;
  timestamp: string;
}

interface ActivityListProps {
  address: string;
}

/**
 * ActivityList: User activity history (buy/sell/mint)
 *
 * Features:
 * - Activity types with icons (LISTED, SOLD, BOUGHT, CANCELED, MINTED)
 * - Responsive table/card layout
 * - Price display for transactions
 * - Timestamp formatting
 */
export function ActivityList({ address }: ActivityListProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: Activity[] }>(`/listings/activity/${address}`)
      .then((res) => setActivities(res.data || []))
      .catch((error) => {
        console.error('Failed to fetch activities:', error);
        setActivities([]);
      })
      .finally(() => setLoading(false));
  }, [address]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                NFT
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                From/To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {activities.map((activity) => (
              <tr key={activity.id} className="transition-colors hover:bg-muted/50">
                <td className="whitespace-nowrap px-6 py-4">
                  <ActivityBadge type={activity.type} />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {activity.nftName || `#${activity.nftId.slice(0, 8)}`}
                    </p>
                    {activity.collectionName && (
                      <p className="text-sm text-muted-foreground">
                        {activity.collectionName}
                      </p>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {activity.price ? (
                    <span className="font-semibold text-foreground">
                      {formatWLC(activity.price)} WLC
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                  {activity.from && <div>From: {shortenAddress(activity.from)}</div>}
                  {activity.to && <div>To: {shortenAddress(activity.to)}</div>}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-4 md:hidden">
        {activities.map((activity) => (
          <div key={activity.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ActivityBadge type={activity.type} />
                  <span className="text-sm text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleDateString('en-US')}
                  </span>
                </div>
                <p className="mt-2 font-medium text-foreground">
                  {activity.nftName || `#${activity.nftId.slice(0, 8)}`}
                </p>
                {activity.collectionName && (
                  <p className="text-sm text-muted-foreground">
                    {activity.collectionName}
                  </p>
                )}
                {activity.price && (
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatWLC(activity.price)} WLC
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ActivityBadge: Badge with icon for activity type
 */
function ActivityBadge({ type }: { type: Activity['type'] }) {
  const config = {
    LISTED: {
      icon: Tag,
      label: 'Listed',
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    SOLD: {
      icon: ShoppingCart,
      label: 'Sold',
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    BOUGHT: {
      icon: ShoppingCart,
      label: 'Bought',
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
    CANCELED: {
      icon: XCircle,
      label: 'Canceled',
      color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
    },
    MINTED: {
      icon: Paintbrush,
      label: 'Minted',
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    },
  };

  const { icon: Icon, label, color } = config[type];

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}
