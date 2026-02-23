/**
 * usePlaceBid - Auction bidding hook
 *
 * Auction.placeBid is payable (bid amount sent via msg.value)
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { AuctionAbi } from '@/lib/contracts/abis';
import { AUCTION_ADDRESS } from '@/lib/contracts/addresses';
import { formatWeb3Error } from '@/lib/utils';

interface PlaceBidParams {
  auctionId: number; // onChainId
  bidAmount: bigint; // in wei
}

export function usePlaceBid() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const placeBid = async ({ auctionId, bidAmount }: PlaceBidParams) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const bidHash = await writeContractAsync({
        address: AUCTION_ADDRESS,
        abi: AuctionAbi,
        functionName: 'placeBid',
        args: [BigInt(auctionId)],
        value: bidAmount,
      });

      setTxHash(bidHash);

      // Wait for transaction
      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: bidHash,
      });

      setIsLoading(false);
      return { success: true, txHash: bidHash, receipt };
    } catch (err) {
      const errorMsg = formatWeb3Error(err);
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
  };

  return {
    placeBid,
    isLoading,
    error,
    txHash,
  };
}
