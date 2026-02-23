/**
 * CreateAuctionModal - Auction creation modal
 *
 * Simple mode: enter starting price + end time only (user decides)
 * End time: datetime-local input (direct selection without presets)
 * Shows auto-cancel notice if an active listing exists
 */

'use client';

import { useState } from 'react';
import { NFT, Listing } from '@/types/nft';
import { parseWLC } from '@/lib/utils';
import { useCreateAuction } from '@/hooks/useCreateAuction';
import { useRouter } from 'next/navigation';

interface CreateAuctionModalProps {
  nft: NFT;
  isOpen: boolean;
  onClose: () => void;
  hasActiveListing: boolean;
  listing: Listing | null;
}

export function CreateAuctionModal({
  nft,
  isOpen,
  onClose,
  hasActiveListing,
  listing,
}: CreateAuctionModalProps) {
  const router = useRouter();
  const { createAuction, isLoading } = useCreateAuction();

  const [startPriceInput, setStartPriceInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Minimum value for datetime-local: current time + 1 minute
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const minDateTime = now.toISOString().slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const price = parseFloat(startPriceInput);
    if (!startPriceInput || price <= 0) {
      setError('Please enter a starting price');
      return;
    }

    if (!endTimeInput) {
      setError('Please select an end time');
      return;
    }

    const endTime = new Date(endTimeInput);
    if (endTime <= new Date()) {
      setError('End time must be after the current time');
      return;
    }

    try {
      const startPriceWei = parseWLC(startPriceInput);

      await createAuction({
        tokenId: nft.tokenId,
        nftContractAddress: nft.contractAddress as `0x${string}`,
        startPrice: startPriceWei,
        endTime,
        hasActiveListing,
        listingId: listing?.id,
      });

      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create auction');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Start Auction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            disabled={isLoading}
          >
            &times;
          </button>
        </div>

        {/* Active listing auto-cancel notice */}
        {hasActiveListing && (
          <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded p-3 text-sm text-yellow-200">
            Your existing fixed-price listing will be automatically canceled
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Starting Price */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Starting Price (WLC)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={startPriceInput}
              onChange={(e) => setStartPriceInput(e.target.value)}
              placeholder="e.g. 1.0"
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium mb-2">
              End Time
            </label>
            <input
              type="datetime-local"
              value={endTimeInput}
              onChange={(e) => setEndTimeInput(e.target.value)}
              min={minDateTime}
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              disabled={isLoading}
            />
          </div>

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
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Start Auction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
