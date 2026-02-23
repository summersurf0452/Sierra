/**
 * useMakeOffer - NFT offer (purchase proposal) creation hook
 *
 * createOffer payable (msg.value = price, WLC instant escrow deposit)
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { OffersAbi } from '@/lib/contracts/abis';
import { OFFERS_ADDRESS } from '@/lib/contracts/addresses';
import { formatWeb3Error } from '@/lib/utils';

interface MakeOfferParams {
  nftContractAddress: `0x${string}`;
  tokenId: string;
  price: bigint;       // BigInt in wei
  expiresAt: Date;     // Expiration time
}

export function useMakeOffer() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const makeOffer = async ({
    nftContractAddress,
    tokenId,
    price,
    expiresAt,
  }: MakeOfferParams) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const expiresAtUnix = BigInt(Math.floor(expiresAt.getTime() / 1000));

      const hash = await writeContractAsync({
        address: OFFERS_ADDRESS,
        abi: OffersAbi,
        functionName: 'createOffer',
        args: [nftContractAddress, BigInt(tokenId), expiresAtUnix],
        value: price,
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
    makeOffer,
    isLoading,
    error,
    txHash,
  };
}
