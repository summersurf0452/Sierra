import { Suspense } from 'react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { api, BACKEND_URL } from '@/lib/api';
import { NFT } from '@/types/nft';

interface User {
  id: string;
  address: string;
  nickname: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

interface UserProfileResponse {
  user: User;
  stats: { ownedCount: number; createdCount: number };
}

interface NftListResponse {
  data: NFT[];
  total: number;
  page: number;
  limit: number;
}

interface ProfilePageProps {
  params: Promise<{ address: string }>;
}

/**
 * Profile Page: User profile with owned/created NFTs and activity
 *
 * Features:
 * - Server Component for SEO
 * - Profile header with user info
 * - Tabs for owned, created, activity
 * - Edit profile modal (client-side)
 */
export default async function ProfilePage({ params }: ProfilePageProps) {
  const { address } = await params;

  // Fetch user data and NFT counts
  let user: User | null = null;
  let ownedCount = 0;
  let createdCount = 0;

  try {
    const response = await fetch(`${BACKEND_URL}/users/${address}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const result: UserProfileResponse = await response.json();
      user = result.user;
    }
  } catch (error) {
    console.error('Failed to fetch user:', error);
  }

  try {
    const response = await fetch(`${BACKEND_URL}/nfts/owner/${address}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      const result: NftListResponse = await response.json();
      ownedCount = result.total;
    }
  } catch (error) {
    console.error('Failed to fetch owned NFTs:', error);
  }

  try {
    const response = await fetch(`${BACKEND_URL}/nfts/creator/${address}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      const result: NftListResponse = await response.json();
      createdCount = result.total;
    }
  } catch (error) {
    console.error('Failed to fetch created NFTs:', error);
  }

  return (
    <div className="min-h-screen">
      <ProfileHeader
        address={address}
        nickname={user?.nickname}
        bio={user?.bio}
        avatar={user?.avatarUrl}
        nftCount={ownedCount}
        createdCount={createdCount}
      />

      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="text-center text-muted-foreground">Loading...</div>
          </div>
        }
      >
        <ProfileTabs address={address} />
      </Suspense>
    </div>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: ProfilePageProps) {
  const { address } = await params;

  try {
    const response = await fetch(`${BACKEND_URL}/users/${address}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const result: UserProfileResponse = await response.json();
      const user = result.user;
      return {
        title: `${user.nickname || address} - Sierra Profile`,
        description: user.bio || `View ${user.nickname || address}'s NFT collection on Sierra`,
      };
    }
  } catch (error) {
    console.error('Failed to generate metadata:', error);
  }

  return {
    title: `${address} - Sierra Profile`,
    description: 'View NFT collection on Sierra',
  };
}
