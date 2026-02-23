'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Pencil } from 'lucide-react';
import { shortenAddress, ipfsToHttp } from '@/lib/utils';
import { EditProfileModal } from './EditProfileModal';
import { OptimizedImage } from '@/components/common/OptimizedImage';

interface ProfileHeaderProps {
  address: string;
  nickname?: string | null;
  bio?: string | null;
  avatar?: string | null;
  nftCount: number;
  createdCount: number;
}

/**
 * ProfileHeader: User profile header with avatar, name, bio, and stats
 *
 * Features:
 * - Circular avatar with fallback icon
 * - Nickname with wallet address
 * - Bio text
 * - NFT statistics (owned, created)
 * - Edit button (only for own profile)
 */
export function ProfileHeader({
  address,
  nickname,
  bio,
  avatar,
  nftCount,
  createdCount,
}: ProfileHeaderProps) {
  const { address: connectedAddress } = useAccount();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const isOwnProfile =
    connectedAddress?.toLowerCase() === address.toLowerCase();

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative h-32 w-32 flex-shrink-0">
            <div className="overflow-hidden rounded-full border-4 border-border bg-muted">
              <OptimizedImage
                src={avatar ? ipfsToHttp(avatar) : ''}
                alt={nickname || address}
                variant="avatar"
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            {/* Name and Edit Button */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {nickname || shortenAddress(address)}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {shortenAddress(address)}
                </p>
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Bio */}
            {bio && (
              <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                {bio}
              </p>
            )}

            {/* Stats */}
            <div className="mt-6 flex gap-8">
              <div>
                <p className="text-2xl font-bold text-foreground">{nftCount}</p>
                <p className="text-sm text-muted-foreground">Owned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {createdCount}
                </p>
                <p className="text-sm text-muted-foreground">Created</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal open={editModalOpen} onOpenChange={setEditModalOpen} />
    </div>
  );
}
