/**
 * useBuyNFT - NFT purchase hook
 *
 * buyListing is payable (msg.value required)
 * Platform fee: 2.5% (250 basis points / 10000)
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { MarketplaceAbi } from '@/lib/contracts/abis';
import { MARKETPLACE_ADDRESS, NFT721_ADDRESS } from '@/lib/contracts/addresses';
import { formatWeb3Error } from '@/lib/utils';

interface BuyNFTParams {
  tokenId: string;
  priceInWei: bigint; // BigInt in wei
}

/**
 * Calculate platform fee (2.5%)
 */
export function calculatePlatformFee(priceInWei: bigint): bigint {
  return (priceInWei * 250n) / 10000n;
}

export function useBuyNFT() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const buy = async ({ tokenId, priceInWei }: BuyNFTParams) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // buyListing with msg.value
      const buyHash = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceAbi,
        functionName: 'buyListing',
        args: [NFT721_ADDRESS, BigInt(tokenId)],
        value: priceInWei, // payable
      });

      setTxHash(buyHash);

      // Wait for transaction
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
