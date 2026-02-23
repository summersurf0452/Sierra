/**
 * useListNFT1155 - ERC-1155 NFT listing hook
 *
 * Marketplace1155.createListing(nftContract, tokenId, amount, pricePerUnit)
 * ERC-1155 escrow: tokens are transferred to Marketplace1155 contract on listing
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { SharedNFT1155Abi, Marketplace1155Abi } from '@/lib/contracts/abis';
import { MARKETPLACE1155_ADDRESS } from '@/lib/contracts/addresses';
import { api } from '@/lib/api';
import { formatWeb3Error, parseWLC } from '@/lib/utils';
import { decodeEventLog } from 'viem';

interface ListNFT1155Params {
  nftContractAddress: `0x${string}`;
  tokenId: string;
  amount: number;
  pricePerUnitInWLC: string; // WLC unit (e.g. "1.5")
}

export function useListNFT1155() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const list = async ({
    nftContractAddress,
    tokenId,
    amount,
    pricePerUnitInWLC,
  }: ListNFT1155Params) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const pricePerUnit = parseWLC(pricePerUnitInWLC);

      // Step 1: Check approval (ERC-1155 uses isApprovedForAll)
      const isApproved = (await publicClient?.readContract({
        address: nftContractAddress,
        abi: SharedNFT1155Abi,
        functionName: 'isApprovedForAll',
        args: [address, MARKETPLACE1155_ADDRESS],
      })) as boolean;

      // Step 2: Approve if needed
      if (!isApproved) {
        const approveHash = await writeContractAsync({
          address: nftContractAddress,
          abi: SharedNFT1155Abi,
          functionName: 'setApprovalForAll',
          args: [MARKETPLACE1155_ADDRESS, true],
        });

        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      }

      // Step 3: Create listing on Marketplace1155
      const listingHash = await writeContractAsync({
        address: MARKETPLACE1155_ADDRESS,
        abi: Marketplace1155Abi,
        functionName: 'createListing',
        args: [
          nftContractAddress,
          BigInt(tokenId),
          BigInt(amount),
          pricePerUnit,
        ],
      });

      setTxHash(listingHash);

      const receipt = await publicClient?.waitForTransactionReceipt({
        hash: listingHash,
      });

      // Parse Listing1155Created event to get onChainListingId
      let onChainListingId: number | undefined;
      if (receipt) {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: Marketplace1155Abi,
              eventName: 'Listing1155Created',
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === 'Listing1155Created') {
              onChainListingId = Number(decoded.args.listingId);
              break;
            }
          } catch {
            continue;
          }
        }
      }

      // Step 4: Register in backend
      await api.post('/listings', {
        seller: address,
        contractAddress: nftContractAddress,
        tokenId,
        price: (pricePerUnit * BigInt(amount)).toString(), // total price
        pricePerUnit: pricePerUnit.toString(),
        amount,
        contractType: 'ERC1155',
        blockNumber: receipt?.blockNumber.toString(),
        transactionHash: listingHash,
        onChainListingId,
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

  return {
    list,
    isLoading,
    error,
    txHash,
  };
}
