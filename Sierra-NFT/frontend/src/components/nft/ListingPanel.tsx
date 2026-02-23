/**
 * ListingPanel - NFT Trading Panel
 *
 * Cases:
 * A. Auction active -> Show AuctionPanel
 * B. No auction:
 *   1. My NFT + not listed -> "List" + "Start Auction" buttons
 *   2. My NFT + listed -> Show current price + "Update Price" + "Cancel Listing" buttons
 *   3. Other's NFT + listed -> Show current price + "Buy" button
 *   4. Other's NFT + not listed -> "Not currently for sale"
 */

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { NFT, Auction, ListingStatus } from '@/types/nft';
import { formatWLC } from '@/lib/utils';
import { api } from '@/lib/api';
import { ListNFTModal } from './ListNFTModal';
import { BuyConfirmModal } from './BuyConfirmModal';
import { ReportModal } from './ReportModal';
import { OfferPanel } from '@/components/offer/OfferPanel';
import { AuctionPanel } from '@/components/auction/AuctionPanel';
import { CreateAuctionModal } from '@/components/auction/CreateAuctionModal';
import { useCancelListing } from '@/hooks/useCancelListing';

interface ListingPanelProps {
  nft: NFT;
}

export function ListingPanel({ nft }: ListingPanelProps) {
  const { address } = useAccount();
  const { cancel, isLoading: isCanceling } = useCancelListing();

  const [showListModal, setShowListModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [listModalMode, setListModalMode] = useState<'create' | 'update'>(
    'create',
  );

  // Find current ACTIVE listing
  const activeListing = nft.listings?.find(
    (listing) => listing.status === ListingStatus.ACTIVE,
  );

  const isOwner =
    address && nft.owner.toLowerCase() === address.toLowerCase();
  const isListed = !!activeListing;

  // Fetch active auction
  const { data: activeAuction } = useQuery<Auction | null>({
    queryKey: ['auction', nft.contractAddress, nft.tokenId],
    queryFn: async () => {
      try {
        const result = await api.get<Auction>(
          `/auctions/nft/${nft.contractAddress}/${nft.tokenId}`,
        );
        return result;
      } catch {
        // No auction on 404 etc.
        return null;
      }
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data && data.status === 'ACTIVE' ? 10000 : 30000;
    },
    staleTime: 5000,
  });

  const handleCancelListing = async () => {
    if (!activeListing) return;

    if (!confirm('Are you sure you want to cancel this listing?')) return;

    try {
      await cancel({
        tokenId: nft.tokenId,
        listingId: activeListing.id,
      });
      alert('Listing has been cancelled');
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Failed to cancel listing');
    }
  };

  const handleUpdatePrice = () => {
    setListModalMode('update');
    setShowListModal(true);
  };

  const handleCreateListing = () => {
    setListModalMode('create');
    setShowListModal(true);
  };

  // Show AuctionPanel when auction is active
  if (activeAuction && activeAuction.status === 'ACTIVE') {
    return (
      <div className="space-y-4">
        <AuctionPanel
          auction={activeAuction}
          nft={nft}
          isOwner={!!isOwner}
        />

        {/* Offer section (ERC-721 only) */}
        {nft.contractType !== 'ERC1155' && (
          <OfferPanel nft={nft} isOwner={!!isOwner} hasActiveAuction={!!(activeAuction && activeAuction.status === 'ACTIVE')} />
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-6 space-y-4">
      {/* Case 1: My NFT + not listed */}
      {isOwner && !isListed && (
        <div className="space-y-4">
          <div className="text-muted-foreground">You can sell this NFT</div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateListing}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition"
            >
              List for Sale
            </button>
            {nft.contractType !== 'ERC1155' && (
              <button
                onClick={() => setShowAuctionModal(true)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Start Auction
              </button>
            )}
          </div>
        </div>
      )}

      {/* Case 2: My NFT + listed */}
      {isOwner && isListed && (
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Current Price</div>
            <div className="text-3xl font-bold">
              {formatWLC(activeListing.price)} WLC
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdatePrice}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Update Price
            </button>
            <button
              onClick={handleCancelListing}
              disabled={isCanceling}
              className="flex-1 bg-destructive hover:bg-destructive/90 disabled:bg-gray-600 text-destructive-foreground font-semibold py-3 px-6 rounded-lg transition"
            >
              {isCanceling ? 'Cancelling...' : 'Cancel Listing'}
            </button>
          </div>
          {/* Can start auction while listed (auto-cancel) */}
          {nft.contractType !== 'ERC1155' && (
            <button
              onClick={() => setShowAuctionModal(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              Switch to Auction
            </button>
          )}
        </div>
      )}

      {/* Case 3: Other's NFT + listed */}
      {!isOwner && isListed && (
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Current Price</div>
            <div className="text-3xl font-bold">
              {formatWLC(activeListing.price)} WLC
            </div>
          </div>
          <button
            onClick={() => setShowBuyModal(true)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition"
          >
            Buy Now
          </button>
        </div>
      )}

      {/* Case 4: Other's NFT + not listed */}
      {!isOwner && !isListed && (
        <div className="text-center text-muted-foreground py-4">
          Not currently for sale
        </div>
      )}

      {/* Listing modal */}
      {showListModal && (
        <ListNFTModal
          nft={nft}
          mode={listModalMode}
          currentListing={activeListing}
          onClose={() => setShowListModal(false)}
          onSuccess={() => {
            setShowListModal(false);
            window.location.reload();
          }}
        />
      )}

      {/* Buy confirmation modal */}
      {showBuyModal && activeListing && (
        <BuyConfirmModal
          nft={nft}
          listing={activeListing}
          onClose={() => setShowBuyModal(false)}
          onSuccess={() => {
            setShowBuyModal(false);
            window.location.reload();
          }}
        />
      )}

      {/* Create auction modal */}
      <CreateAuctionModal
        nft={nft}
        isOpen={showAuctionModal}
        onClose={() => setShowAuctionModal(false)}
        hasActiveListing={isListed}
        listing={activeListing || null}
      />

      {/* Offer section (ERC-721 only, always shown regardless of listing status) */}
      {nft.contractType !== 'ERC1155' && (
        <OfferPanel nft={nft} isOwner={!!isOwner} />
      )}

      {/* Report button */}
      {!isOwner && (
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            title="Report"
          >
            <Flag className="h-4 w-4" />
            <span>Report</span>
          </button>
        </div>
      )}

      {/* Report modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="NFT"
        targetId={nft.id}
      />
    </div>
  );
}
