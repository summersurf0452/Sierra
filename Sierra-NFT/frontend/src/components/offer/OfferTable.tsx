/**
 * OfferTable - Offer list table
 *
 * Columns: Price (WLC), Offerer (shortenAddress), Expiry, Status
 * If isOwner, shows "Accept" button per row (ACTIVE only)
 * If currentAddress == offerer, shows "Cancel" button (ACTIVE), "Withdraw" button (EXPIRED)
 * Responsive: card layout on mobile
 */

'use client';

import { Offer, OfferStatus } from '@/types/nft';
import { formatWLC, shortenAddress } from '@/lib/utils';
import { useAcceptOffer } from '@/hooks/useAcceptOffer';
import { useCancelOffer } from '@/hooks/useCancelOffer';
import { useWithdrawOffer } from '@/hooks/useWithdrawOffer';
import { useRouter } from 'next/navigation';

interface OfferTableProps {
  offers: Offer[];
  isOwner: boolean;
  currentAddress: string | undefined;
  nftContractAddress: string;
  tokenId: string;
  hasActiveAuction?: boolean;
}

function formatTimeRemaining(expiresAt: string): string {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getStatusLabel(status: OfferStatus): string {
  switch (status) {
    case OfferStatus.ACTIVE:
      return 'Active';
    case OfferStatus.ACCEPTED:
      return 'Accepted';
    case OfferStatus.CANCELED:
      return 'Canceled';
    case OfferStatus.EXPIRED:
      return 'Expired';
    case OfferStatus.WITHDRAWN:
      return 'Withdrawn';
    default:
      return status;
  }
}

function getStatusColor(status: OfferStatus): string {
  switch (status) {
    case OfferStatus.ACTIVE:
      return 'text-green-400';
    case OfferStatus.ACCEPTED:
      return 'text-blue-400';
    case OfferStatus.CANCELED:
      return 'text-gray-400';
    case OfferStatus.EXPIRED:
      return 'text-yellow-400';
    case OfferStatus.WITHDRAWN:
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

export function OfferTable({
  offers,
  isOwner,
  currentAddress,
  nftContractAddress,
  tokenId,
  hasActiveAuction,
}: OfferTableProps) {
  const router = useRouter();
  const { acceptOffer, isLoading: isAccepting } = useAcceptOffer();
  const { cancelOffer, isLoading: isCanceling } = useCancelOffer();
  const { withdrawOffer, isLoading: isWithdrawing } = useWithdrawOffer();

  const handleAccept = async (offer: Offer) => {
    if (!confirm('Accept this offer? The NFT will be transferred to the offerer.')) return;

    try {
      await acceptOffer({
        offerId: offer.onChainId,
        nftContractAddress: nftContractAddress as `0x${string}`,
        tokenId,
      });
      alert('Offer accepted successfully');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to accept offer');
    }
  };

  const handleCancel = async (offer: Offer) => {
    if (!confirm('Cancel this offer? Your deposit will be refunded.')) return;

    try {
      await cancelOffer({ offerId: offer.onChainId });
      alert('Offer canceled successfully');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel offer');
    }
  };

  const handleWithdraw = async (offer: Offer) => {
    try {
      await withdrawOffer({ offerId: offer.onChainId });
      alert('Deposit withdrawn successfully');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to withdraw deposit');
    }
  };

  if (offers.length === 0) {
    return (
      <div className="text-center text-gray-400 py-4 text-sm">
        No offers yet
      </div>
    );
  }

  const isActionLoading = isAccepting || isCanceling || isWithdrawing;

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left py-2 pr-4">Price</th>
              <th className="text-left py-2 pr-4">Offerer</th>
              <th className="text-left py-2 pr-4">Expires</th>
              <th className="text-left py-2 pr-4">Status</th>
              <th className="text-right py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const isMyOffer =
                currentAddress &&
                offer.offerer.toLowerCase() === currentAddress.toLowerCase();
              const isExpired =
                offer.status === OfferStatus.ACTIVE &&
                new Date(offer.expiresAt).getTime() < Date.now();

              return (
                <tr
                  key={offer.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50"
                >
                  <td className="py-3 pr-4 font-mono font-semibold">
                    {formatWLC(offer.price)} WLC
                  </td>
                  <td className="py-3 pr-4 text-gray-300">
                    {shortenAddress(offer.offerer)}
                  </td>
                  <td className="py-3 pr-4 text-gray-400">
                    {formatTimeRemaining(offer.expiresAt)}
                  </td>
                  <td className={`py-3 pr-4 ${getStatusColor(offer.status)}`}>
                    {isExpired ? 'Expired' : getStatusLabel(offer.status)}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {/* Owner: Accept button (ACTIVE only, no auction) */}
                      {isOwner &&
                        !hasActiveAuction &&
                        offer.status === OfferStatus.ACTIVE &&
                        !isExpired && (
                          <button
                            onClick={() => handleAccept(offer)}
                            disabled={isActionLoading}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition"
                          >
                            Accept
                          </button>
                        )}

                      {/* My offer: Cancel button (ACTIVE) */}
                      {isMyOffer &&
                        offer.status === OfferStatus.ACTIVE &&
                        !isExpired && (
                          <button
                            onClick={() => handleCancel(offer)}
                            disabled={isActionLoading}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs rounded transition"
                          >
                            Cancel
                          </button>
                        )}

                      {/* My offer: Withdraw button (EXPIRED, not WITHDRAWN) */}
                      {isMyOffer &&
                        (offer.status === OfferStatus.EXPIRED ||
                          (offer.status === OfferStatus.ACTIVE && isExpired)) && (
                          <button
                            onClick={() => handleWithdraw(offer)}
                            disabled={isActionLoading}
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-xs rounded transition"
                          >
                            Withdraw
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {offers.map((offer) => {
          const isMyOffer =
            currentAddress &&
            offer.offerer.toLowerCase() === currentAddress.toLowerCase();
          const isExpired =
            offer.status === OfferStatus.ACTIVE &&
            new Date(offer.expiresAt).getTime() < Date.now();

          return (
            <div
              key={offer.id}
              className="border border-gray-700 rounded-lg p-4 space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-semibold">
                  {formatWLC(offer.price)} WLC
                </span>
                <span className={`text-xs ${getStatusColor(offer.status)}`}>
                  {isExpired ? 'Expired' : getStatusLabel(offer.status)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>{shortenAddress(offer.offerer)}</span>
                <span>{formatTimeRemaining(offer.expiresAt)}</span>
              </div>
              <div className="flex gap-2 pt-1">
                {isOwner &&
                  !hasActiveAuction &&
                  offer.status === OfferStatus.ACTIVE &&
                  !isExpired && (
                    <button
                      onClick={() => handleAccept(offer)}
                      disabled={isActionLoading}
                      className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition"
                    >
                      Accept
                    </button>
                  )}
                {isMyOffer &&
                  offer.status === OfferStatus.ACTIVE &&
                  !isExpired && (
                    <button
                      onClick={() => handleCancel(offer)}
                      disabled={isActionLoading}
                      className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs rounded transition"
                    >
                      Cancel
                    </button>
                  )}
                {isMyOffer &&
                  (offer.status === OfferStatus.EXPIRED ||
                    (offer.status === OfferStatus.ACTIVE && isExpired)) && (
                    <button
                      onClick={() => handleWithdraw(offer)}
                      disabled={isActionLoading}
                      className="flex-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-xs rounded transition"
                    >
                      Withdraw
                    </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
