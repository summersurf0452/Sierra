/**
 * useCancelListing - Listing cancellation hook
 *
 * cancelListing call → receipt → backend PATCH
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { MarketplaceAbi } from '@/lib/contracts/abis';
import { MARKETPLACE_ADDRESS, NFT721_ADDRESS } from '@/lib/contracts/addresses';
import { api } from '@/lib/api';
import { formatWeb3Error } from '@/lib/utils';

interface CancelListingParams {
  tokenId: string;
  listingId: string; // Backend listing UUID
}

export function useCancelListing() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const cancel = async ({ tokenId, listingId }: CancelListingParams) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // cancelListing
      const cancelHash = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceAbi,
        functionName: 'cancelListing',
        args: [NFT721_ADDRESS, BigInt(tokenId)],
      });

      setTxHash(cancelHash);

      // Wait for transaction
      await publicClient?.waitForTransactionReceipt({ hash: cancelHash });

      // Backend PATCH
      await api.patch(`/listings/${listingId}/canceled`);

      setIsLoading(false);
      return { success: true, txHash: cancelHash };
    } catch (err) {
      const errorMsg = formatWeb3Error(err);
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
  };

  return {
    cancel,
    isLoading,
    error,
    txHash,
  };
}
