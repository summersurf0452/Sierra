'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CollectionTable } from '@/components/admin/CollectionTable';
import { api } from '@/lib/api';
import { Collection } from '@/types/nft';

interface CollectionsResponse {
  data: Collection[];
  total: number;
}

/**
 * Admin Collections Page - /admin/collections
 *
 * Lists all collections with verify/unverify and hide/unhide actions.
 * API calls: PATCH /admin/collections/:id/verify, /unverify, /hide, /unhide.
 */
export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await api.get<CollectionsResponse>('/admin/collections', {
        params: { page: 1, limit: 50 },
      });
      setCollections(res.data);
    } catch {
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleVerify = async (id: string) => {
    try {
      await api.patch(`/admin/collections/${id}/verify`);
      toast.success('Collection has been verified');
      fetchCollections();
    } catch {
      toast.error('Failed to verify collection');
    }
  };

  const handleUnverify = async (id: string) => {
    try {
      await api.patch(`/admin/collections/${id}/unverify`);
      toast.success('Verification has been revoked');
      fetchCollections();
    } catch {
      toast.error('Failed to revoke verification');
    }
  };

  const handleHide = async (id: string) => {
    try {
      await api.patch(`/admin/collections/${id}/hide`);
      toast.success('Collection has been hidden');
      fetchCollections();
    } catch {
      toast.error('Failed to hide collection');
    }
  };

  const handleUnhide = async (id: string) => {
    try {
      await api.patch(`/admin/collections/${id}/unhide`);
      toast.success('Collection is now visible');
      fetchCollections();
    } catch {
      toast.error('Failed to unhide collection');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Collection Management</h1>
        <span className="text-sm text-muted-foreground">
          {collections.length} collections
        </span>
      </div>

      <CollectionTable
        collections={collections}
        onVerify={handleVerify}
        onUnverify={handleUnverify}
        onHide={handleHide}
        onUnhide={handleUnhide}
        loading={loading}
      />
    </div>
  );
}
