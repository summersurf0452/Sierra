/**
 * NFT Detail Page
 *
 * Server Component - GET /nfts/:id fetch → passes data to NFTDetail + NFTActivity
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { NFTDetail } from '@/components/nft/NFTDetail';
import { NFTActivity } from '@/components/nft/NFTActivity';
import { BACKEND_URL } from '@/lib/api';
import { NFT } from '@/types/nft';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getNFT(id: string): Promise<NFT | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/nfts/${id}`, {
      cache: 'no-store', // real-time data
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch NFT:', error);
    return null;
  }
}

export default async function NFTPage({ params }: PageProps) {
  const { id } = await params;
  const nft = await getNFT(id);

  if (!nft) {
    notFound();
  }

  // Hidden NFT warning page
  if (nft.isHidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive/50" />
        <h2 className="text-xl font-semibold">Hidden NFT</h2>
        <p className="text-muted-foreground text-center">
          This NFT has been hidden due to community reports.
        </p>
        <Link href="/" className="text-primary hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NFTDetail nft={nft} />

      {/* Activity Section */}
      <div className="mt-12">
        <div className="mb-6 border-t border-border pt-8">
          <h2 className="text-2xl font-bold text-foreground">Activity</h2>
        </div>
        <NFTActivity nftId={nft.id} />
      </div>
    </div>
  );
}
