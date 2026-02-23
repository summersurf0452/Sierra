/**
 * AuctionCountdown - OpenSea-style countdown timer
 *
 * Uses react-countdown. Displays remaining time in large numbers.
 * Shows "Auction Ended" text (red-500) when complete.
 */

'use client';

import Countdown from 'react-countdown';

interface AuctionCountdownProps {
  endTime: number; // Unix timestamp (ms)
  onComplete?: () => void;
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-card rounded-lg p-3 min-w-[60px]">
      <span className="text-4xl font-bold text-foreground tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );
}

export function AuctionCountdown({ endTime, onComplete }: AuctionCountdownProps) {
  return (
    <Countdown
      date={endTime}
      onComplete={onComplete}
      renderer={({ days, hours, minutes, seconds, completed }) => {
        if (completed) {
          return (
            <span className="text-red-500 text-2xl font-bold">
              Auction Ended
            </span>
          );
        }

        return (
          <div className="flex gap-4">
            {days > 0 && <TimeUnit value={days} label="d" />}
            <TimeUnit value={hours} label="h" />
            <TimeUnit value={minutes} label="m" />
            <TimeUnit value={seconds} label="s" />
          </div>
        );
      }}
    />
  );
}
