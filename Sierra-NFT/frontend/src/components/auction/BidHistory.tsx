/**
 * BidHistory - Bid History Table
 *
 * Sorted by most recent. Shows bidder, amount, time, transaction hash.
 */

'use client';

import { Bid } from '@/types/nft';
import { shortenAddress, formatWLC } from '@/lib/utils';

interface BidHistoryProps {
  bids?: Bid[];
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function BidHistory({ bids }: BidHistoryProps) {
  if (!bids || bids.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4 text-sm">
        No bids yet
      </div>
    );
  }

  // Sort by most recent
  const sortedBids = [...bids].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">Bid History</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2">Bidder</th>
              <th className="text-right py-2">Amount</th>
              <th className="text-right py-2">Time</th>
              <th className="text-right py-2">Tx</th>
            </tr>
          </thead>
          <tbody>
            {sortedBids.map((bid) => (
              <tr key={bid.id} className="border-b border-border">
                <td className="py-2 text-white">
                  {shortenAddress(bid.bidder)}
                </td>
                <td className="py-2 text-right text-white font-medium">
                  {formatWLC(bid.amount)} WLC
                </td>
                <td className="py-2 text-right text-muted-foreground">
                  {timeAgo(bid.createdAt)}
                </td>
                <td className="py-2 text-right">
                  <a
                    href={`https://scan.worldland.foundation/tx/${bid.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {shortenAddress(bid.transactionHash)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
