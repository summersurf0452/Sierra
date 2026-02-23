/**
 * ListNFTModal - NFT Listing Modal
 *
 * mode='create': New listing
 * mode='update': Price update (cancel + relist notice)
 *
 * ERC-1155 support: amount + price per unit input, uses useListNFT1155
 */

'use client';

import { useState } from 'react';
import { useListNFT } from '@/hooks/useListNFT';
import { useListNFT1155 } from '@/hooks/useListNFT1155';
import { NFT, Listing } from '@/types/nft';
import { formatWLC, parseWLC } from '@/lib/utils';

interface ListNFTModalProps {
  nft: NFT;
  mode: 'create' | 'update';
  currentListing?: Listing;
  onClose: () => void;
  onSuccess: () => void;
}

export function ListNFTModal({
  nft,
  mode,
  currentListing,
  onClose,
  onSuccess,
}: ListNFTModalProps) {
  const { list: listERC721, updatePrice, isLoading: isLoading721 } = useListNFT();
  const { list: listERC1155, isLoading: isLoading1155 } = useListNFT1155();

  const isERC1155 = nft.contractType === 'ERC1155';
  const isLoading = isERC1155 ? isLoading1155 : isLoading721;

  const [priceInput, setPriceInput] = useState(
    mode === 'update' && currentListing
      ? isERC1155 && currentListing.pricePerUnit
        ? formatWLC(currentListing.pricePerUnit)
        : formatWLC(currentListing.price)
      : '',
  );
  const [amountInput, setAmountInput] = useState(
    isERC1155 ? '1' : '',
  );
  const [error, setError] = useState<string | null>(null);

  const MAX_DECIMALS = 4;

  const handlePriceChange = (value: string) => {
    const parts = value.split('.');
    if (parts.length > 1 && parts[1].length > MAX_DECIMALS) {
      return;
    }
    setPriceInput(value);
  };

  // Calculate total price for ERC-1155
  const amount = parseInt(amountInput) || 0;
  const pricePerUnit = parseFloat(priceInput) || 0;
  const totalPrice = isERC1155 ? amount * pricePerUnit : pricePerUnit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = parseFloat(priceInput);
    if (!priceInput || price <= 0) {
      setError(isERC1155 ? 'Please enter a price per unit' : 'Please enter a price');
      return;
    }

    if (price < 0.0001) {
      setError('Minimum price is 0.0001 WLC');
      return;
    }

    if (isERC1155) {
      const qty = parseInt(amountInput);
      if (!qty || qty < 1) {
        setError('Listing amount must be at least 1');
        return;
      }
      // supply check: amount should be <= available supply
      if (qty > nft.supply) {
        setError(`Cannot exceed owned amount (${nft.supply})`);
        return;
      }
    }

    try {
      if (isERC1155) {
        await listERC1155({
          nftContractAddress: nft.contractAddress as `0x${string}`,
          tokenId: nft.tokenId,
          amount: parseInt(amountInput),
          pricePerUnitInWLC: priceInput,
        });
        alert('ERC-1155 listing completed');
      } else if (mode === 'create') {
        await listERC721({
          tokenId: nft.tokenId,
          priceInWLC: priceInput,
        });
        alert('Listing completed');
      } else {
        if (!currentListing) {
          throw new Error('Current listing information not found');
        }

        await updatePrice({
          tokenId: nft.tokenId,
          oldListingId: currentListing.id,
          newPriceInWLC: priceInput,
        });
        alert('Price has been updated');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Listing failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {mode === 'create'
              ? isERC1155
                ? 'List ERC-1155'
                : 'List NFT'
              : 'Update Price'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white text-2xl"
          >
            x
          </button>
        </div>

        {mode === 'update' && !isERC1155 && (
          <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded p-3 text-sm text-yellow-200">
            Updating the price will cancel the existing listing and create a new one. (2-step transaction)
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ERC-1155: Amount input */}
          {isERC1155 && mode === 'create' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Listing Amount
                <span className="text-xs text-muted-foreground ml-2">
                  (Owned: {nft.supply})
                </span>
              </label>
              <input
                type="number"
                min="1"
                max={nft.supply}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="e.g. 5"
                className="w-full bg-muted border border-border rounded px-4 py-2 focus:outline-none focus:border-primary"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Price input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {isERC1155 ? 'Price per Unit (WLC)' : 'Price (WLC)'}
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={priceInput}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="e.g. 1.5"
              className="w-full bg-muted border border-border rounded px-4 py-2 focus:outline-none focus:border-primary"
              disabled={isLoading}
            />
          </div>

          {/* ERC-1155: Total price preview */}
          {isERC1155 && amount > 0 && pricePerUnit > 0 && (
            <div className="bg-muted rounded p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span>{amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per Unit</span>
                <span className="font-mono">{priceInput} WLC</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between font-bold">
                <span>Total Price</span>
                <span className="font-mono">{totalPrice.toFixed(4)} WLC</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-gray-600 text-primary-foreground font-semibold py-2 px-4 rounded transition"
              disabled={isLoading}
            >
              {isLoading
                ? 'Processing...'
                : mode === 'create'
                  ? 'List'
                  : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
