'use client';

import { useState, useEffect } from 'react';
import { NFT } from '@/types/nft';
import { NFTGrid } from '@/components/nft/NFTGrid';
import { ActivityList } from './ActivityList';
import { api } from '@/lib/api';

interface ProfileTabsProps {
  address: string;
}

type Tab = 'owned' | 'created' | 'activity';

/**
 * ProfileTabs: Owned / Created / Activity tabs for user profile
 *
 * Features:
 * - Tab navigation (Owned, Created, Activity)
 * - NFT grid for Owned and Created tabs
 * - Activity list for Activity tab
 * - Data fetching per tab
 */
export function ProfileTabs({ address }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('owned');
  const [ownedNFTs, setOwnedNFTs] = useState<NFT[]>([]);
  const [createdNFTs, setCreatedNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'owned', label: 'Owned' },
    { id: 'created', label: 'Created' },
    { id: 'activity', label: 'Activity' },
  ];

  // Fetch owned NFTs
  useEffect(() => {
    if (activeTab === 'owned') {
      setLoading(true);
      api
        .get<{ data: NFT[] }>(`/nfts/owner/${address}`)
        .then((res) => setOwnedNFTs(res.data || []))
        .catch((error) => {
          console.error('Failed to fetch owned NFTs:', error);
          setOwnedNFTs([]);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab, address]);

  // Fetch created NFTs
  useEffect(() => {
    if (activeTab === 'created') {
      setLoading(true);
      api
        .get<{ data: NFT[] }>(`/nfts/creator/${address}`)
        .then((res) => setCreatedNFTs(res.data || []))
        .catch((error) => {
          console.error('Failed to fetch created NFTs:', error);
          setCreatedNFTs([]);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab, address]);

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex gap-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'owned' && (
          <NFTGrid
            nfts={ownedNFTs}
            loading={loading}
            emptyMessage="No owned NFTs"
          />
        )}

        {activeTab === 'created' && (
          <NFTGrid
            nfts={createdNFTs}
            loading={loading}
            emptyMessage="No created NFTs"
          />
        )}

        {activeTab === 'activity' && <ActivityList address={address} />}
      </div>
    </div>
  );
}
