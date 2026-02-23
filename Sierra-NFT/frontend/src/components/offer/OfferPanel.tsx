/**
 * OfferPanel - Offer list display + Make Offer button
 *
 * - Highest offer highlight card at top + full offer table
 * - Shows "offers not available" message for ERC-1155 NFTs
 * - Fetches from GET /offers/nft/:contractAddress/:tokenId (30s polling)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { NFT, Offer, OfferStatus } from '@/types/nft';
import { formatWLC, shortenAddress } from '@/lib/utils';
import { api } from '@/lib/api';
import { OfferTable } from './OfferTable';
import { MakeOfferModal } from './MakeOfferModal';
import { useAcceptOffer } from '@/hooks/useAcceptOffer';
import { useRouter } from 'next/navigation';

interface OfferPanelProps {
  nft: NFT;
  isOwner: boolean;
  hasActiveAuction?: boolean;
}

function formatTimeRemaining(expiresAt: string): string {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m remaining`;
}

export function OfferPanel({ nft, isOwner, hasActiveAuction }: OfferPanelProps) {
  const { address } = useAccount();
  const router = useRouter();
  const { acceptOffer, isLoading: isAccepting } = useAcceptOffer();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMakeOfferModal, setShowMakeOfferModal] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOffers = useCallback(async () => {
    try {
      const data = await api.get<Offer[]>(
        `/offers/nft/${nft.contractAddress}/${nft.tokenId}`,
      );
      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoading(false);
    }
  }, [nft.contractAddress, nft.tokenId]);

  useEffect(() => {
    fetchOffers();

    // 30s polling
    intervalRef.current = setInterval(fetchOffers, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchOffers]);

  // Offers not available for ERC-1155 NFTs
  if (nft.contractType === 'ERC1155') {
    return (
      <div className="border border-border rounded-lg p-4 mt-4">
        <h3 className="text-lg font-semibold mb-2">Offers</h3>
        <div className="text-center text-muted-foreground py-4 text-sm">
          Offers are only available for ERC-721 NFTs
        </div>
      </div>
    );
  }

  // Active offers only (check expiry)
  const activeOffers = offers.filter(
    (o) =>
      o.status === OfferStatus.ACTIVE &&
      new Date(o.expiresAt).getTime() > Date.now(),
  );

  const highestOffer = activeOffers.length > 0 ? activeOffers[0] : null;

  const handleAcceptHighest = async () => {
    if (!highestOffer) return;
    if (!confirm('Accept the highest offer? The NFT will be transferred to the offerer.'))
      return;

    try {
      await acceptOffer({
        offerId: highestOffer.onChainId,
        nftContractAddress: nft.contractAddress as `0x${string}`,
        tokenId: nft.tokenId,
      });
      alert('Offer accepted');
      router.refresh();
      fetchOffers();
    } catch (err: any) {
      alert(err.message || 'Failed to accept offer');
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Offers {activeOffers.length > 0 && `(${activeOffers.length})`}
        </h3>
        {!isOwner && (
          <button
            onClick={() => setShowMakeOfferModal(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg transition"
          >
            Make Offer
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-4 text-sm">
          Loading offers...
        </div>
      ) : (
        <>
          {/* Highest offer highlight card */}
          {highestOffer && (
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-600/50 rounded-lg p-4 mb-4">
              <div className="text-xs text-blue-400 mb-1">Highest Offer</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {formatWLC(highestOffer.price)} WLC
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {shortenAddress(highestOffer.offerer)} |{' '}
                    {formatTimeRemaining(highestOffer.expiresAt)}
                  </div>
                </div>
                {isOwner && !hasActiveAuction && (
                  <button
                    onClick={handleAcceptHighest}
                    disabled={isAccepting}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-gray-600 text-primary-foreground font-semibold rounded-lg transition"
                  >
                    {isAccepting ? 'Processing...' : 'Accept'}
                  </button>
                )}
                {isOwner && hasActiveAuction && (
                  <span className="text-sm text-yellow-400">
                    Auction in progress
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Full offer table */}
          <OfferTable
            offers={offers}
            isOwner={isOwner}
            currentAddress={address}
            nftContractAddress={nft.contractAddress}
            tokenId={nft.tokenId}
            hasActiveAuction={hasActiveAuction}
          />
        </>
      )}

      {/* Make offer modal */}
      <MakeOfferModal
        nft={nft}
        isOpen={showMakeOfferModal}
        onClose={() => setShowMakeOfferModal(false)}
        onSuccess={() => {
          fetchOffers();
        }}
      />
    </div>
  );
}
