/**
 * useBuyNFT1155 - ERC-1155 NFT purchase hook
 *
 * Marketplace1155.buyListing(listingId, amount) payable
 * value = pricePerUnit * amount
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { Marketplace1155Abi } from '@/lib/contracts/abis';
import { MARKETPLACE1155_ADDRESS } from '@/lib/contracts/addresses';
import { formatWeb3Error } from '@/lib/utils';

interface BuyNFT1155Params {
  listingId: number;     // onChain listing ID
  amount: number;        // Purchase quantity
  pricePerUnit: bigint;  // Price per unit (wei)
}

/**
 * Calculate platform fee (2.5%)
 */
export function calculatePlatformFee1155(
  pricePerUnit: bigint,
  amount: number,
): bigint {
  const totalPrice = pricePerUnit * BigInt(amount);
  return (totalPrice * 250n) / 10000n;
}

export function useBuyNFT1155() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const buy = async ({ listingId, amount, pricePerUnit }: BuyNFT1155Params) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const totalPrice = pricePerUnit * BigInt(amount);

      const buyHash = await writeContractAsync({
        address: MARKETPLACE1155_ADDRESS,
        abi: Marketplace1155Abi,
        functionName: 'buyListing',
        args: [BigInt(listingId), BigInt(amount)],
        value: totalPrice,
      });

      setTxHash(buyHash);

      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: buyHash,
      });

      setIsLoading(false);
      return { success: true, txHash: buyHash, receipt };
    } catch (err) {
      const errorMsg = formatWeb3Error(err);
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
  };

  return {
    buy,
    isLoading,
    error,
    txHash,
  };
}
