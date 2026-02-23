/**
 * useCreateAuction - Auction creation hook
 *
 * Flow:
 * 1. Cancel existing fixed-price listing first if any
 * 2. Check NFT approval: verify if Auction contract is approved, setApprovalForAll if not
 * 3. Call Auction.createAuction
 * 4. waitForTransactionReceipt
 * 5. Extract auctionId from event logs
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import {
  SharedNFT721Abi,
  AuctionAbi,
  MarketplaceAbi,
} from '@/lib/contracts/abis';
import {
  AUCTION_ADDRESS,
  MARKETPLACE_ADDRESS,
  NFT721_ADDRESS,
} from '@/lib/contracts/addresses';
import { api } from '@/lib/api';
import { formatWeb3Error } from '@/lib/utils';
import { decodeEventLog } from 'viem';

interface CreateAuctionParams {
  tokenId: string;
  nftContractAddress: `0x${string}`;
  startPrice: bigint;
  endTime: Date;
  hasActiveListing: boolean;
  listingId?: string; // Backend listing UUID (for cancellation)
}

export function useCreateAuction() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const createAuction = async (params: CreateAuctionParams) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      // Step 1: Cancel existing listing first if any
      if (params.hasActiveListing && params.listingId) {
        const cancelHash = await writeContractAsync({
          address: MARKETPLACE_ADDRESS,
          abi: MarketplaceAbi,
          functionName: 'cancelListing',
          args: [params.nftContractAddress, BigInt(params.tokenId)],
        });

        await publicClient?.waitForTransactionReceipt({ hash: cancelHash });

        // Reflect cancellation in backend
        await api.patch(`/listings/${params.listingId}/canceled`);
      }

      // Step 2: Check NFT approval (for Auction contract)
      const approved = (await publicClient?.readContract({
        address: params.nftContractAddress,
        abi: SharedNFT721Abi,
        functionName: 'getApproved',
        args: [BigInt(params.tokenId)],
      })) as `0x${string}`;

      const isApprovedForAll = (await publicClient?.readContract({
        address: params.nftContractAddress,
        abi: SharedNFT721Abi,
        functionName: 'isApprovedForAll',
        args: [address, AUCTION_ADDRESS],
      })) as boolean;

      if (
        approved.toLowerCase() !== AUCTION_ADDRESS.toLowerCase() &&
        !isApprovedForAll
      ) {
        const approveHash = await writeContractAsync({
          address: params.nftContractAddress,
          abi: SharedNFT721Abi,
          functionName: 'setApprovalForAll',
          args: [AUCTION_ADDRESS, true],
        });

        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      }

      // Step 3: createAuction
      const endTimeUnix = BigInt(
        Math.floor(params.endTime.getTime() / 1000),
      );

      const auctionHash = await writeContractAsync({
        address: AUCTION_ADDRESS,
        abi: AuctionAbi,
        functionName: 'createAuction',
        args: [
          params.nftContractAddress,
          BigInt(params.tokenId),
          params.startPrice,
          endTimeUnix,
        ],
      });

      setTxHash(auctionHash);

      // Step 4: waitForTransactionReceipt
      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: auctionHash,
      });

      // Step 5: Extract auctionId from event logs
      let auctionId: bigint | undefined;
      if (receipt?.logs) {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: AuctionAbi,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === 'AuctionCreated') {
              auctionId = (decoded.args as { auctionId: bigint }).auctionId;
              break;
            }
          } catch {
            // Skip other event logs
          }
        }
      }

      setIsLoading(false);
      return {
        success: true,
        txHash: auctionHash,
        auctionId: auctionId !== undefined ? Number(auctionId) : undefined,
        receipt,
      };
    } catch (err) {
      const errorMsg = formatWeb3Error(err);
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
  };

  return {
    createAuction,
    isLoading,
    error,
    txHash,
  };
}
