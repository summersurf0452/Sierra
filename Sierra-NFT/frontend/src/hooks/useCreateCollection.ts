'use client';

import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Step } from '@/components/transaction/ProgressStepper';
import { BACKEND_URL } from '@/lib/api';
import { NFT721_ADDRESS, NFT1155_ADDRESS } from '@/lib/contracts/addresses';
import { SharedNFT721Abi, SharedNFT1155Abi } from '@/lib/contracts/abis';
import { ipfsToHttp } from '@/lib/utils';
import { decodeEventLog } from 'viem';

type CreateStatus =
  | 'idle'
  | 'uploading'
  | 'simulating'
  | 'signing'
  | 'confirming'
  | 'registering'
  | 'uploading-batch'
  | 'minting-batch'
  | 'success'
  | 'error';

interface CreateCollectionData {
  name: string;
  symbol: string;
  royaltyPercentage: number; // 0-10 (percentage from UI input)
  description?: string;
  coverImage?: File;
  contractType: 'ERC721' | 'ERC1155';
  batchItems?: Array<{
    file: File;
    name: string;
    description: string;
  }>;
}

interface CreateResult {
  collectionId: bigint;
  transactionHash: string;
}

export function useCreateCollection() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [status, setStatus] = useState<CreateStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  const reset = () => {
    setStatus('idle');
    setError(null);
    setResult(null);
  };

  const create = async (
    data: CreateCollectionData,
  ): Promise<CreateResult> => {
    if (!address || !publicClient || !walletClient) {
      throw new Error('Wallet is not connected');
    }

    try {
      setError(null);

      let coverImageUrl: string | undefined;

      // Step 1: Upload cover image to IPFS (optional)
      if (data.coverImage) {
        setStatus('uploading');
        const formData = new FormData();
        formData.append('file', data.coverImage);

        const imageResponse = await fetch(`${BACKEND_URL}/ipfs/upload/image`, {
          method: 'POST',
          body: formData,
        });

        if (!imageResponse.ok) {
          const errBody = await imageResponse.json().catch(() => null);
          const errMsg = errBody?.message || imageResponse.statusText;
          throw new Error(`Failed to upload cover image: ${errMsg}`);
        }

        const { httpUrl } = await imageResponse.json();
        coverImageUrl = httpUrl;
      }

      // Step 2: Simulate contract call
      setStatus('simulating');

      // Convert percentage to basis points (0-10% -> 0-1000)
      const royaltyBps = BigInt(Math.floor(data.royaltyPercentage * 100));

      const contractAddress = data.contractType === 'ERC1155' ? NFT1155_ADDRESS : NFT721_ADDRESS;
      const contractAbi = data.contractType === 'ERC1155' ? SharedNFT1155Abi : SharedNFT721Abi;

      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'createCollection',
        args: [data.name, data.symbol, royaltyBps],
        account: address,
      });

      // Step 3: Sign and send transaction
      setStatus('signing');
      const hash = await walletClient.writeContract(request);

      // Step 4: Wait for transaction confirmation
      setStatus('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Step 5: Parse CollectionCreated event to get collectionId
      let collectionId: bigint | null = null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: contractAbi,
            eventName: 'CollectionCreated',
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'CollectionCreated') {
            collectionId = decoded.args.collectionId;
            break;
          }
        } catch {
          // Skip logs that don't match
          continue;
        }
      }

      if (collectionId === null) {
        throw new Error('Collection creation event not found');
      }

      // Step 6: Register collection in backend
      setStatus('registering');
      const registerResponse = await fetch(`${BACKEND_URL}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          onChainId: Number(collectionId),
          name: data.name,
          symbol: data.symbol,
          description: data.description || null,
          coverImageUrl: coverImageUrl || null,
          creator: address,
          contractType: data.contractType,
          contractAddress: contractAddress,
          royaltyPercentage: Math.floor(data.royaltyPercentage * 100),
        }),
      });

      if (!registerResponse.ok) {
        console.error('Failed to register collection in backend');
        // Don't throw - collection is created on-chain, indexer will catch it
      }

      // Step 7: Batch upload + mint NFTs (if batchItems provided)
      if (data.batchItems && data.batchItems.length > 0) {
        setStatus('uploading-batch');
        setBatchProgress({ current: 0, total: data.batchItems.length });

        // 7a: Upload all images at once
        const batchFormData = new FormData();
        data.batchItems.forEach((item) => {
          batchFormData.append('files', item.file);
        });

        const batchImageResponse = await fetch(`${BACKEND_URL}/ipfs/upload/batch`, {
          method: 'POST',
          body: batchFormData,
        });

        if (!batchImageResponse.ok) {
          throw new Error('Batch image upload failed');
        }

        const batchImageResult = await batchImageResponse.json();

        if (!batchImageResult.results || batchImageResult.results.length === 0) {
          throw new Error('No images were uploaded successfully');
        }

        // 7b: Upload all metadata at once
        const metadataList = batchImageResult.results.map((img: any, idx: number) => ({
          name: data.batchItems![idx]?.name || `NFT #${idx + 1}`,
          description: data.batchItems![idx]?.description || `${data.name} - NFT #${idx + 1}`,
          image: img.cid,
        }));

        const metadataResponse = await fetch(`${BACKEND_URL}/ipfs/upload/metadata/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadataList),
        });

        if (!metadataResponse.ok) {
          throw new Error('Batch metadata upload failed');
        }

        const metadataResult = await metadataResponse.json();

        // 7c: Mint each NFT on-chain
        setStatus('minting-batch');
        for (let i = 0; i < metadataResult.results.length; i++) {
          setBatchProgress({ current: i + 1, total: metadataResult.results.length });
          const tokenURI = metadataResult.results[i].cid;
          const imgCid = batchImageResult.results[i]?.cid;

          try {
            // Simulate + write contract (split by type for TS narrowing)
            let mintHash: `0x${string}`;
            if (data.contractType === 'ERC721') {
              const { request: mintReq } = await publicClient.simulateContract({
                address: NFT721_ADDRESS,
                abi: SharedNFT721Abi,
                functionName: 'mint',
                args: [collectionId, tokenURI],
                account: address,
              });
              mintHash = await walletClient.writeContract(mintReq);
            } else {
              const { request: mintReq } = await publicClient.simulateContract({
                address: NFT1155_ADDRESS,
                abi: SharedNFT1155Abi,
                functionName: 'mint',
                args: [collectionId, BigInt(1), tokenURI],
                account: address,
              });
              mintHash = await walletClient.writeContract(mintReq);
            }

            const abi = data.contractType === 'ERC721' ? SharedNFT721Abi : SharedNFT1155Abi;
            const mintReceipt = await publicClient.waitForTransactionReceipt({
              hash: mintHash,
              confirmations: 1,
            });

            // Parse tokenId from event
            let mintedTokenId: bigint | null = null;
            for (const log of mintReceipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi,
                  eventName: 'NFTMinted',
                  data: log.data,
                  topics: log.topics,
                });
                if (decoded.eventName === 'NFTMinted') {
                  mintedTokenId = (decoded.args as any).tokenId;
                  break;
                }
              } catch { continue; }
            }

            // Register in backend
            if (mintedTokenId !== null) {
              await fetch(`${BACKEND_URL}/nfts/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  tokenId: mintedTokenId.toString(),
                  collectionId: collectionId.toString(), // will be resolved by backend
                  owner: address,
                  tokenURI,
                  contractAddress: data.contractType === 'ERC721' ? NFT721_ADDRESS : NFT1155_ADDRESS,
                  contractType: data.contractType,
                  supply: data.contractType === 'ERC1155' ? 1 : undefined,
                  name: data.batchItems![i]?.name || `NFT #${i + 1}`,
                  description: data.batchItems![i]?.description || '',
                  imageUrl: batchImageResult.results[i]?.s3Url || ipfsToHttp(imgCid || ''),
                }),
              }).catch(err => console.error(`Failed to register NFT #${i + 1}:`, err));
            }
          } catch (mintErr) {
            console.error(`Failed to mint NFT #${i + 1}:`, mintErr);
            // Continue minting remaining NFTs
          }
        }
      }

      const createResult: CreateResult = {
        collectionId,
        transactionHash: hash,
      };

      setResult(createResult);
      setStatus('success');

      return createResult;
    } catch (err) {
      console.error('Create collection error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create collection',
      );
      setStatus('error');
      throw err;
    }
  };

  // Generate steps for progress modal
  const steps: Step[] = [
    {
      label: 'IPFS Upload',
      description: 'Uploading cover image...',
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
      label: 'Collection Registration',
      description: 'Registering collection in database...',
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
    {
      label: 'Batch NFT Upload',
      description: 'Uploading NFT images & metadata to IPFS...',
      status:
        status === 'uploading-batch'
          ? 'current'
          : [
                'idle',
                'uploading',
                'simulating',
                'signing',
                'confirming',
                'registering',
              ].includes(status)
            ? 'pending'
            : status === 'error' && error?.includes('batch')
              ? 'error'
              : 'completed',
    },
    {
      label: 'Batch Minting',
      description: batchProgress.total > 0
        ? `Minting NFT ${batchProgress.current}/${batchProgress.total} on-chain...`
        : 'Minting NFTs on blockchain...',
      status:
        status === 'minting-batch'
          ? 'current'
          : [
                'idle',
                'uploading',
                'simulating',
                'signing',
                'confirming',
                'registering',
                'uploading-batch',
              ].includes(status)
            ? 'pending'
            : status === 'error' && error?.includes('mint')
              ? 'error'
              : 'completed',
    },
  ];

  return {
    create,
    reset,
    status,
    error,
    result,
    steps,
    batchProgress,
    isLoading: status !== 'idle' && status !== 'success' && status !== 'error',
  };
}
