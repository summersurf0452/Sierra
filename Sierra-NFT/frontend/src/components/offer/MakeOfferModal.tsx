/**
 * MakeOfferModal - Offer creation modal
 *
 * Price (WLC) + expiration input (presets 1/3/7/30 days + custom input)
 * Deposits WLC to escrow immediately to send the offer
 */

'use client';

import { useState } from 'react';
import { useMakeOffer } from '@/hooks/useMakeOffer';
import { NFT } from '@/types/nft';
import { parseWLC } from '@/lib/utils';

interface MakeOfferModalProps {
  nft: NFT;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const EXPIRY_PRESETS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

export function MakeOfferModal({
  nft,
  isOpen,
  onClose,
  onSuccess,
}: MakeOfferModalProps) {
  const { makeOffer, isLoading } = useMakeOffer();

  const [priceInput, setPriceInput] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(7); // default 7 days
  const [customExpiry, setCustomExpiry] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getExpiresAt = (): Date | null => {
    if (selectedPreset !== null) {
      const date = new Date();
      date.setDate(date.getDate() + selectedPreset);
      return date;
    }
    if (customExpiry) {
      const date = new Date(customExpiry);
      if (date.getTime() > Date.now()) return date;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = parseFloat(priceInput);
    if (!priceInput || price <= 0) {
      setError('Please enter a price');
      return;
    }

    if (price < 0.0001) {
      setError('Minimum price is 0.0001 WLC');
      return;
    }

    const expiresAt = getExpiresAt();
    if (!expiresAt) {
      setError('Please set a valid expiration date');
      return;
    }

    if (expiresAt.getTime() <= Date.now()) {
      setError('Expiration date must be in the future');
      return;
    }

    try {
      const priceInWei = parseWLC(priceInput);

      await makeOffer({
        nftContractAddress: nft.contractAddress as `0x${string}`,
        tokenId: nft.tokenId,
        price: priceInWei,
        expiresAt,
      });

      alert('Offer submitted successfully');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit offer');
    }
  };

  const handlePresetSelect = (days: number) => {
    setSelectedPreset(days);
    setCustomExpiry('');
  };

  const handleCustomExpiryChange = (value: string) => {
    setCustomExpiry(value);
    setSelectedPreset(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Make an Offer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            x
          </button>
        </div>

        {/* NFT Info */}
        <div className="text-sm text-gray-400">
          {nft.collection?.name && (
            <span>{nft.collection.name} - </span>
          )}
          <span className="text-white font-medium">
            {nft.name || `#${nft.tokenId}`}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Price (WLC)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="e.g. 1.5"
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* Expiration Presets */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Expiration
            </label>
            <div className="flex gap-2 mb-2">
              {EXPIRY_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => handlePresetSelect(preset.days)}
                  className={`flex-1 px-3 py-1.5 text-sm rounded transition ${
                    selectedPreset === preset.days
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                  disabled={isLoading}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <input
              type="datetime-local"
              value={customExpiry}
              onChange={(e) => handleCustomExpiryChange(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className={`w-full bg-gray-800 border rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                selectedPreset === null && customExpiry
                  ? 'border-blue-500'
                  : 'border-gray-700'
              }`}
              disabled={isLoading}
              placeholder="Or pick a custom date"
            />
          </div>

          {/* Info Text */}
          {priceInput && parseFloat(priceInput) > 0 && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded p-3 text-sm text-blue-200">
              {priceInput} WLC will be deposited to send this offer. If the offer is
              not accepted, you can cancel and get a refund at any time.
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Make Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
