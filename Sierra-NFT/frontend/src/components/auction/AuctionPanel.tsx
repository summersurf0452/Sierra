/**
 * AuctionPanel - Auction details + Bidding UI
 *
 * Displays: countdown, highest bid, start price, minimum bid amount, bid count
 * Bid form: shown only for non-owners
 * Includes BidHistory
 */

'use client';

import { useState } from 'react';
import { Auction, NFT } from '@/types/nft';
import { formatWLC } from '@/lib/utils';
import { parseEther } from 'viem';
import { usePlaceBid } from '@/hooks/usePlaceBid';
import { AuctionCountdown } from './AuctionCountdown';
import { BidHistory } from './BidHistory';
import { useRouter } from 'next/navigation';

interface AuctionPanelProps {
  auction: Auction;
  nft: NFT;
  isOwner: boolean;
}

export function AuctionPanel({ auction, nft, isOwner }: AuctionPanelProps) {
  const router = useRouter();
  const { placeBid, isLoading, error } = usePlaceBid();
  const [bidInput, setBidInput] = useState('');
  const [bidError, setBidError] = useState<string | null>(null);

  const endTimeMs = new Date(auction.endTime).getTime();
  const isEnded = Date.now() >= endTimeMs;

  // Calculate minimum bid amount
  const highestBid = BigInt(auction.highestBid);
  const minBidIncrement = BigInt(auction.minBidIncrement);
  const startPrice = BigInt(auction.startPrice);

  const minimumBid =
    highestBid > 0n ? highestBid + minBidIncrement : startPrice;

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidError(null);

    if (!bidInput || parseFloat(bidInput) <= 0) {
      setBidError('Please enter a bid amount');
      return;
    }

    try {
      const bidAmountWei = parseEther(bidInput);

      if (bidAmountWei < minimumBid) {
        setBidError(
          `Minimum bid is ${formatWLC(minimumBid.toString())} WLC`,
        );
        return;
      }

      await placeBid({
        auctionId: auction.onChainId,
        bidAmount: bidAmountWei,
      });

      setBidInput('');
      router.refresh();
    } catch (err: any) {
      setBidError(err.message || 'Failed to place bid');
    }
  };

  return (
    <div className="border border-border rounded-lg p-6 space-y-6">
      {/* Auction countdown */}
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          {isEnded ? 'Auction Ended' : 'Time Remaining'}
        </div>
        <AuctionCountdown
          endTime={endTimeMs}
          onComplete={() => router.refresh()}
        />
      </div>

      {/* Bid information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Current Highest Bid</div>
          <div className="text-2xl font-bold">
            {highestBid > 0n
              ? `${formatWLC(auction.highestBid)} WLC`
              : 'No bids'}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Start Price</div>
          <div className="text-lg font-medium text-muted-foreground">
            {formatWLC(auction.startPrice)} WLC
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Minimum Bid</div>
          <div className="text-sm font-medium text-muted-foreground">
            {formatWLC(minimumBid.toString())} WLC
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Bid Count</div>
          <div className="text-sm font-medium text-muted-foreground">
            {auction.bidCount}
          </div>
        </div>
      </div>

      {/* Bid form (non-owner + auction in progress only) */}
      {!isOwner && !isEnded && (
        <form onSubmit={handlePlaceBid} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Bid Amount (WLC)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={bidInput}
              onChange={(e) => setBidInput(e.target.value)}
              placeholder={`Min ${formatWLC(minimumBid.toString())} WLC`}
              className="w-full bg-muted border border-border rounded px-4 py-2 focus:outline-none focus:border-primary"
              disabled={isLoading}
            />
          </div>

          {(bidError || error) && (
            <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded p-3 text-sm text-red-200">
              {bidError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-600 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition"
          >
            {isLoading ? 'Placing Bid...' : 'Place Bid'}
          </button>
        </form>
      )}

      {/* When owner */}
      {isOwner && !isEnded && (
        <div className="text-center text-muted-foreground py-2 text-sm">
          Auction is in progress
        </div>
      )}

      {/* After auction ends */}
      {isEnded && (
        <div className="text-center text-muted-foreground py-2">
          Auction has ended
        </div>
      )}

      {/* Bid history */}
      <BidHistory bids={auction.bids} />
    </div>
  );
}
