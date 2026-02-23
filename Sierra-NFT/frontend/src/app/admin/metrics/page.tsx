'use client';

import { MetricsTab } from '@/components/admin/MetricsTab';

export default function AdminMetricsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Performance Monitoring
      </h1>
      <MetricsTab />
    </div>
  );
}
