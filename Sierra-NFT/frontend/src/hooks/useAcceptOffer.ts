/**
 * useAcceptOffer - Offer acceptance hook
 *
 * When NFT owner accepts an offer, NFT is sent to offerer, WLC to seller
 * Approval check: verify if Offers contract is approved, then setApprovalForAll
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { SharedNFT721Abi, OffersAbi } from '@/lib/contracts/abis';
import { OFFERS_ADDRESS } from '@/lib/contracts/addresses';
import { formatWeb3Error } from '@/lib/utils';

interface AcceptOfferParams {
  offerId: number;                // onChainId
  nftContractAddress: `0x${string}`;
  tokenId: string;
}

export function useAcceptOffer() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const acceptOffer = async ({
    offerId,
    nftContractAddress,
    tokenId,
  }: AcceptOfferParams) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // Step 1: Check approval
      const approved = (await publicClient?.readContract({
        address: nftContractAddress,
        abi: SharedNFT721Abi,
        functionName: 'getApproved',
        args: [BigInt(tokenId)],
      })) as `0x${string}`;

      const isApprovedForAll = (await publicClient?.readContract({
        address: nftContractAddress,
        abi: SharedNFT721Abi,
        functionName: 'isApprovedForAll',
        args: [address, OFFERS_ADDRESS],
      })) as boolean;

      // Step 2: Approve if needed
      if (
        approved.toLowerCase() !== OFFERS_ADDRESS.toLowerCase() &&
        !isApprovedForAll
      ) {
        const approveHash = await writeContractAsync({
          address: nftContractAddress,
          abi: SharedNFT721Abi,
          functionName: 'setApprovalForAll',
          args: [OFFERS_ADDRESS, true],
        });

        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      }

      // Step 3: Accept offer
      const hash = await writeContractAsync({
        address: OFFERS_ADDRESS,
        abi: OffersAbi,
        functionName: 'acceptOffer',
        args: [BigInt(offerId)],
      });

      setTxHash(hash);

      await publicClient?.waitForTransactionReceipt({ hash });

      setIsLoading(false);
      return { success: true, txHash: hash };
    } catch (err) {
      const errorMsg = formatWeb3Error(err);
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
  };

  return {
    acceptOffer,
    isLoading,
    error,
    txHash,
  };
}
