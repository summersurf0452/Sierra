/**
 * useListNFT - NFT listing hook
 *
 * Features:
 * - list(): Check Marketplace approval → approve (if needed) → createListing → backend registration
 * - updatePrice(): cancelListing → backend cancel → approval check → createListing → backend registration
 */

import { useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { SharedNFT721Abi, MarketplaceAbi } from '@/lib/contracts/abis';
import { NFT721_ADDRESS, MARKETPLACE_ADDRESS } from '@/lib/contracts/addresses';
import { api } from '@/lib/api';
import { formatWeb3Error, parseWLC } from '@/lib/utils';

interface ListNFTParams {
  tokenId: string;
  priceInWLC: string; // WLC unit (e.g. "1.5")
}

interface UpdatePriceParams {
  tokenId: string;
  oldListingId: string;
  newPriceInWLC: string;
}

export function useListNFT() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * Create a new NFT listing
   */
  const list = async ({ tokenId, priceInWLC }: ListNFTParams) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const priceInWei = parseWLC(priceInWLC);

      // Step 1: Check Marketplace approval
      const approved = (await publicClient?.readContract({
        address: NFT721_ADDRESS,
        abi: SharedNFT721Abi,
        functionName: 'getApproved',
        args: [BigInt(tokenId)],
      })) as `0x${string}`;

      const isApprovedForAll = (await publicClient?.readContract({
        address: NFT721_ADDRESS,
        abi: SharedNFT721Abi,
        functionName: 'isApprovedForAll',
        args: [address, MARKETPLACE_ADDRESS],
      })) as boolean;

      // Step 2: Approve (if needed)
      if (
        approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase() &&
        !isApprovedForAll
      ) {
        const approveHash = await writeContractAsync({
          address: NFT721_ADDRESS,
          abi: SharedNFT721Abi,
          functionName: 'approve',
          args: [MARKETPLACE_ADDRESS, BigInt(tokenId)],
        });

        // Wait for approval
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      }

      // Step 3: createListing
      const listingHash = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceAbi,
        functionName: 'createListing',
        args: [NFT721_ADDRESS, BigInt(tokenId), priceInWei],
      });

      setTxHash(listingHash);

      // Wait for listing transaction
      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: listingHash,
      });

      // Step 4: Register in backend
      await api.post('/listings', {
        seller: address,
        contractAddress: NFT721_ADDRESS,
        tokenId,
        price: priceInWei.toString(),
        blockNumber: receipt?.blockNumber.toString(),
        transactionHash: listingHash,
      });

      setIsLoading(false);
      return { success: true, txHash: listingHash };
    } catch (err) {
      const errorMsg = formatWeb3Error(err);
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
  };

  /**
   * Update listing price (cancel + relist)
   */
  const updatePrice = async ({
    tokenId,
    oldListingId,
    newPriceInWLC,
  }: UpdatePriceParams) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    let cancelSucceeded = false;

    try {
      const newPriceInWei = parseWLC(newPriceInWLC);

      // Step 1: cancelListing
      const cancelHash = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceAbi,
        functionName: 'cancelListing',
        args: [NFT721_ADDRESS, BigInt(tokenId)],
      });

      // Wait for cancel transaction
      await publicClient?.waitForTransactionReceipt({ hash: cancelHash });

      // Step 2: Cancel in backend
      await api.patch(`/listings/${oldListingId}/canceled`);
      cancelSucceeded = true;

      // Step 3: Check approval (likely already approved)
      const approved = (await publicClient?.readContract({
        address: NFT721_ADDRESS,
        abi: SharedNFT721Abi,
        functionName: 'getApproved',
        args: [BigInt(tokenId)],
      })) as `0x${string}`;

      const isApprovedForAll = (await publicClient?.readContract({
        address: NFT721_ADDRESS,
        abi: SharedNFT721Abi,
        functionName: 'isApprovedForAll',
        args: [address, MARKETPLACE_ADDRESS],
      })) as boolean;

      // Approve if needed
      if (
        approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase() &&
        !isApprovedForAll
      ) {
        const approveHash = await writeContractAsync({
          address: NFT721_ADDRESS,
          abi: SharedNFT721Abi,
          functionName: 'approve',
          args: [MARKETPLACE_ADDRESS, BigInt(tokenId)],
        });

        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      }

      // Step 4: createListing (with new price)
      const listingHash = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MarketplaceAbi,
        functionName: 'createListing',
        args: [NFT721_ADDRESS, BigInt(tokenId), newPriceInWei],
      });

      setTxHash(listingHash);

      // Wait for listing transaction
      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: listingHash,
      });

      // Step 5: Register in backend
      await api.post('/listings', {
        seller: address,
        contractAddress: NFT721_ADDRESS,
        tokenId,
        price: newPriceInWei.toString(),
        blockNumber: receipt?.blockNumber.toString(),
        transactionHash: listingHash,
      });

      setIsLoading(false);
      return { success: true, txHash: listingHash };
    } catch (err) {
      const errorMsg = formatWeb3Error(err);
      setError(errorMsg);
      setIsLoading(false);

      // Distinguish error: cancel succeeded + relisting failed
      if (cancelSucceeded) {
        throw new Error(
          `Listing was canceled but relisting failed: ${errorMsg}`,
        );
      } else {
        throw new Error(errorMsg);
      }
    }
  };

  return {
    list,
    updatePrice,
    isLoading,
    error,
    txHash,
  };
}
