'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  Cpu,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';

interface SlowEndpoint {
  path: string;
  method: string;
  avgDuration: number;
  count: number;
}

interface MetricsData {
  api: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    avgDuration: number;
    p95Duration: number;
    slowestEndpoints: SlowEndpoint[];
  };
  blockchain: {
    blockNumber: string;
    lagSeconds: number;
    healthy: boolean;
  };
  business: {
    sales24h: number;
    volume24h: string;
    mints24h: number;
    activeUsers7d: number;
  };
}

function formatWei(wei: string): string {
  try {
    const value = BigInt(wei);
    const whole = value / BigInt(10 ** 18);
    const fraction = value % BigInt(10 ** 18);
    const fractionStr = fraction.toString().padStart(18, '0').slice(0, 4);
    return `${whole.toLocaleString()}.${fractionStr}`;
  } catch {
    return '0';
  }
}

/**
 * MetricsTab - Performance monitoring dashboard for Admin
 *
 * Displays 3 sections: API Performance, Blockchain Status, Business Metrics
 * Auto-refreshes every 30 seconds
 */
export function MetricsTab() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await api.get<MetricsData>('/admin/metrics');
      setMetrics(data);
      setLastUpdated(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-4">
            <div className="h-5 bg-muted rounded w-32 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((card) => (
                <div
                  key={card}
                  className="bg-card border border-border rounded-lg p-6 animate-pulse"
                >
                  <div className="h-4 bg-muted rounded w-20 mb-4" />
                  <div className="h-8 bg-muted rounded w-16 mb-2" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm p-8">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        Unable to load metrics.
        <button
          onClick={fetchMetrics}
          className="ml-2 text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { api: apiMetrics, blockchain, business } = metrics;

  return (
    <div className="space-y-8">
      {/* Last Updated */}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <RefreshCw className="w-3 h-3" />
        Last updated:{' '}
        {lastUpdated
          ? lastUpdated.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '-'}
      </div>

      {/* API Performance Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-foreground">API Performance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard
            title="Total Requests"
            value={apiMetrics.totalRequests.toLocaleString()}
            subtitle="Last 1 hour"
            accentColor="text-blue-500"
          />
          <MetricCard
            title="Error Rate"
            value={`${apiMetrics.errorRate}%`}
            subtitle={`${apiMetrics.errorCount} errors`}
            accentColor={apiMetrics.errorRate > 5 ? 'text-red-500' : 'text-green-500'}
            highlight={apiMetrics.errorRate > 5}
          />
          <MetricCard
            title="Avg Response Time"
            value={`${apiMetrics.avgDuration}ms`}
            subtitle="Last 1 hour"
            accentColor="text-blue-500"
          />
          <MetricCard
            title="P95 Response Time"
            value={`${apiMetrics.p95Duration}ms`}
            subtitle="Top 5% threshold"
            accentColor="text-blue-500"
          />
        </div>

        {/* Slowest Endpoints */}
        {apiMetrics.slowestEndpoints.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Slowest Endpoints (Top 5)
            </h3>
            <div className="space-y-2">
              {apiMetrics.slowestEndpoints.map((ep, i) => (
                <div
                  key={`${ep.method}-${ep.path}`}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{i + 1}.</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {ep.method}
                    </span>
                    <span className="text-foreground font-mono text-xs">
                      {ep.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{ep.avgDuration}ms avg</span>
                    <span>{ep.count} calls</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Blockchain Status Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Blockchain Status
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Current Block"
            value={BigInt(blockchain.blockNumber).toLocaleString()}
            subtitle="WorldLand Mainnet"
            accentColor="text-purple-500"
          />
          <MetricCard
            title="Sync Lag"
            value={
              blockchain.lagSeconds >= 0
                ? `${blockchain.lagSeconds}s`
                : 'N/A'
            }
            subtitle={blockchain.lagSeconds < 120 ? 'Normal range' : 'Lag detected'}
            accentColor={
              blockchain.lagSeconds >= 0 && blockchain.lagSeconds < 120
                ? 'text-green-500'
                : 'text-red-500'
            }
          />
          <div className="bg-card border border-border rounded-lg p-6">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="mt-2 flex items-center gap-2">
              {blockchain.healthy ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-500/10 text-green-500">
                    Healthy
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-500" />
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-500/10 text-red-500">
                    Unhealthy
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Business Metrics Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Business Metrics
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="24h Sales"
            value={business.sales24h.toLocaleString()}
            subtitle="transactions"
            accentColor="text-green-500"
          />
          <MetricCard
            title="24h Volume"
            value={`${formatWei(business.volume24h)} WLC`}
            subtitle="Total trade amount"
            accentColor="text-green-500"
          />
          <MetricCard
            title="24h Mints"
            value={business.mints24h.toLocaleString()}
            subtitle="transactions"
            accentColor="text-green-500"
          />
          <MetricCard
            title="7d Active Users"
            value={business.activeUsers7d.toLocaleString()}
            subtitle="Unique addresses"
            accentColor="text-green-500"
          />
        </div>
      </section>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  accentColor: string;
  highlight?: boolean;
}

function MetricCard({
  title,
  value,
  subtitle,
  accentColor,
  highlight,
}: MetricCardProps) {
  return (
    <div
      className={`bg-card border rounded-lg p-6 ${
        highlight ? 'border-red-500/50' : 'border-border'
      }`}
    >
      <span className="text-sm text-muted-foreground">{title}</span>
      <div className={`text-2xl font-bold mt-1 ${accentColor}`}>{value}</div>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </div>
  );
}
