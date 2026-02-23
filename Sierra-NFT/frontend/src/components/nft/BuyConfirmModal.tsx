/**
 * BuyConfirmModal - NFT Purchase Confirmation Modal
 *
 * NFT mini card + price + fee (2.5%) + total breakdown
 * ERC-1155: purchase amount input + price per unit + total price display
 */

'use client';

import { useState } from 'react';
import { useBuyNFT, calculatePlatformFee } from '@/hooks/useBuyNFT';
import { useBuyNFT1155, calculatePlatformFee1155 } from '@/hooks/useBuyNFT1155';
import { NFT, Listing } from '@/types/nft';
import { formatWLC, ipfsToHttp } from '@/lib/utils';
import { OptimizedImage } from '@/components/common/OptimizedImage';

interface BuyConfirmModalProps {
  nft: NFT;
  listing: Listing;
  onClose: () => void;
  onSuccess: () => void;
}

export function BuyConfirmModal({
  nft,
  listing,
  onClose,
  onSuccess,
}: BuyConfirmModalProps) {
  const { buy: buyERC721, isLoading: isLoading721 } = useBuyNFT();
  const { buy: buyERC1155, isLoading: isLoading1155 } = useBuyNFT1155();

  const isERC1155 = listing.contractType === 'ERC1155' || (listing.amount !== null && listing.amount !== undefined);
  const isLoading = isERC1155 ? isLoading1155 : isLoading721;

  const [error, setError] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState(1);

  const imageSrc = nft.imageUrl ? ipfsToHttp(nft.imageUrl) : '';

  // ERC-1155 pricing
  const pricePerUnitWei = isERC1155 && listing.pricePerUnit
    ? BigInt(listing.pricePerUnit)
    : BigInt(listing.price);

  const availableAmount = listing.amount || 1;

  // ERC-721 pricing
  const priceInWei = isERC1155
    ? pricePerUnitWei * BigInt(buyAmount)
    : BigInt(listing.price);

  const platformFee = isERC1155
    ? calculatePlatformFee1155(pricePerUnitWei, buyAmount)
    : calculatePlatformFee(priceInWei);

  const totalAmount = priceInWei;

  const handleConfirm = async () => {
    setError(null);

    try {
      if (isERC1155) {
        await buyERC1155({
          listingId: listing.onChainListingId ?? 0,
          amount: buyAmount,
          pricePerUnit: pricePerUnitWei,
        });
      } else {
        await buyERC721({
          tokenId: nft.tokenId,
          priceInWei: totalAmount,
        });
      }
      alert('Purchase completed!');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Confirm Purchase</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white text-2xl"
          >
            x
          </button>
        </div>

        {/* NFT mini card */}
        <div className="flex gap-4 items-center border border-border rounded-lg p-4">
          <div className="w-20 h-20 relative bg-muted rounded overflow-hidden flex-shrink-0">
            <OptimizedImage
              src={imageSrc}
              alt={nft.name || `NFT #${nft.tokenId}`}
              variant="card"
              className="h-full w-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted-foreground truncate">
              {nft.collection?.name || 'Collection'}
            </div>
            <div className="font-semibold truncate">
              {nft.name || `NFT #${nft.tokenId}`}
            </div>
            {isERC1155 && (
              <div className="text-xs text-blue-400 mt-1">
                ERC-1155 (Available: {availableAmount})
              </div>
            )}
          </div>
        </div>

        {/* ERC-1155: Purchase amount input */}
        {isERC1155 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Purchase Amount
            </label>
            <input
              type="number"
              min={1}
              max={availableAmount}
              value={buyAmount}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setBuyAmount(Math.min(Math.max(1, val), availableAmount));
              }}
              className="w-full bg-muted border border-border rounded px-4 py-2 focus:outline-none focus:border-primary"
              disabled={isLoading}
            />
          </div>
        )}

        {/* Price breakdown */}
        <div className="space-y-2 border border-border rounded-lg p-4">
          {isERC1155 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per Unit</span>
                <span className="font-mono">{formatWLC(pricePerUnitWei)} WLC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span>{buyAmount}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isERC1155 ? 'Subtotal' : 'NFT Price'}
            </span>
            <span className="font-mono">{formatWLC(priceInWei)} WLC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform Fee (2.5%)</span>
            <span className="font-mono">{formatWLC(platformFee)} WLC</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="font-mono text-xl">
              {formatWLC(totalAmount)} WLC
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-gray-600 text-primary-foreground font-semibold py-2 px-4 rounded transition"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}
