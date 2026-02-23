/**
 * useMintNFT1155 - ERC-1155 NFT minting hook
 *
 * Based on useMintNFT pattern (IPFS upload -> sign -> register)
 * Difference: SharedNFT1155.mint(collectionId, address, amount, tokenURI) + supply/contractType
 */

'use client';

import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Step } from '@/components/transaction/ProgressStepper';
import { BACKEND_URL } from '@/lib/api';
import { NFT1155_ADDRESS } from '@/lib/contracts/addresses';
import { SharedNFT1155Abi } from '@/lib/contracts/abis';
import { ipfsToHttp } from '@/lib/utils';
import { decodeEventLog } from 'viem';

type MintStatus =
  | 'idle'
  | 'uploading'
  | 'simulating'
  | 'signing'
  | 'confirming'
  | 'registering'
  | 'success'
  | 'error';

interface MintData1155 {
  name: string;
  description: string;
  image: File;
  onChainId: number;    // Smart contract collection ID
  collectionId: string; // Backend UUID
  amount: number;       // Edition count
}

interface MintResult {
  tokenId: bigint;
  transactionHash: string;
  nftId: string; // Backend UUID
}

export function useMintNFT1155() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [status, setStatus] = useState<MintStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);

  const reset = () => {
    setStatus('idle');
    setError(null);
    setResult(null);
  };

  const mint = async (data: MintData1155): Promise<MintResult> => {
    if (!address || !publicClient || !walletClient) {
      throw new Error('Wallet is not connected');
    }

    try {
      setError(null);

      // Step 1: Upload image to IPFS
      setStatus('uploading');
      const formData = new FormData();
      formData.append('file', data.image);

      const imageResponse = await fetch(`${BACKEND_URL}/ipfs/upload/image`, {
        method: 'POST',
        body: formData,
      });

      if (!imageResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { cid: imageUrl, s3Url } = await imageResponse.json();

      // Step 2: Upload metadata to IPFS
      const metadataResponse = await fetch(
        `${BACKEND_URL}/ipfs/upload/metadata`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            image: imageUrl,
          }),
        },
      );

      if (!metadataResponse.ok) {
        throw new Error('Failed to upload metadata');
      }

      const { cid: tokenURI } = await metadataResponse.json();

      // Step 3: Simulate contract call
      setStatus('simulating');
      const { request } = await publicClient.simulateContract({
        address: NFT1155_ADDRESS,
        abi: SharedNFT1155Abi,
        functionName: 'mint',
        args: [BigInt(data.onChainId), BigInt(data.amount), tokenURI],
        account: address,
      });

      // Step 4: Sign and send transaction
      setStatus('signing');
      const hash = await walletClient.writeContract(request);

      // Step 5: Wait for transaction confirmation
      setStatus('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Step 6: Parse NFTMinted event to get tokenId
      let tokenId: bigint | null = null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: SharedNFT1155Abi,
            eventName: 'NFTMinted',
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'NFTMinted') {
            tokenId = decoded.args.tokenId;
            break;
          }
        } catch {
          continue;
        }
      }

      if (tokenId === null) {
        throw new Error('NFT minting event not found');
      }

      // Step 7: Register NFT in backend
      setStatus('registering');
      const registerResponse = await fetch(`${BACKEND_URL}/nfts/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tokenId: tokenId.toString(),
          collectionId: data.collectionId,
          owner: address,
          tokenURI,
          contractAddress: NFT1155_ADDRESS,
          contractType: 'ERC1155',
          supply: data.amount,
          name: data.name,
          description: data.description,
          imageUrl: s3Url || ipfsToHttp(imageUrl),
        }),
      });

      if (!registerResponse.ok) {
        console.error('Failed to register NFT in backend');
        // Don't throw - NFT is minted on-chain, indexer will catch it
      }

      const registeredNft = await registerResponse.json();

      const mintResult: MintResult = {
        tokenId,
        transactionHash: hash,
        nftId: registeredNft.id,
      };

      setResult(mintResult);
      setStatus('success');

      return mintResult;
    } catch (err) {
      console.error('Mint error:', err);
      setError(err instanceof Error ? err.message : 'Minting failed');
      setStatus('error');
      throw err;
    }
  };

  // Generate steps for progress modal
  const steps: Step[] = [
    {
      label: 'IPFS Upload',
      description: 'Uploading image and metadata...',
      status:
        status === 'uploading'
          ? 'current'
          : status === 'idle'
            ? 'pending'
            : status === 'error' && error?.includes('upload')
              ? 'error'
              : 'completed',
    },
    {
      label: 'Transaction Simulation',
      description: 'Validating transaction...',
      status:
        status === 'simulating'
          ? 'current'
          : ['idle', 'uploading'].includes(status)
            ? 'pending'
            : status === 'error' && error?.includes('simulate')
              ? 'error'
              : 'completed',
    },
    {
      label: 'Transaction Signing',
      description: 'Please approve the transaction in your wallet',
      status:
        status === 'signing'
          ? 'current'
          : ['idle', 'uploading', 'simulating'].includes(status)
            ? 'pending'
            : status === 'error' && error?.includes('rejected')
              ? 'error'
              : 'completed',
    },
    {
      label: 'Blockchain Confirmation',
      description: 'Recording transaction on blockchain...',
      status:
        status === 'confirming'
          ? 'current'
          : ['idle', 'uploading', 'simulating', 'signing'].includes(status)
            ? 'pending'
            : status === 'error' &&
                error?.includes('confirm') &&
                !error?.includes('register')
              ? 'error'
              : 'completed',
    },
    {
      label: 'NFT Registration',
      description: 'Registering NFT in database...',
      status:
        status === 'registering'
          ? 'current'
          : [
                'idle',
                'uploading',
                'simulating',
                'signing',
                'confirming',
              ].includes(status)
            ? 'pending'
            : status === 'error' && error?.includes('register')
              ? 'error'
              : 'completed',
    },
  ];

  return {
    mint,
    reset,
    status,
    error,
    result,
    steps,
    isLoading: status !== 'idle' && status !== 'success' && status !== 'error',
  };
}
