/**
 * useWithdrawOffer - Expired offer deposit withdrawal hook
 *
 * Manual Pull pattern: offerer withdraws deposit from expired offers
 */

import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { OffersAbi } from '@/lib/contracts/abis';
import { OFFERS_ADDRESS } from '@/lib/contracts/addresses';
import { formatWeb3Error } from '@/lib/utils';

interface WithdrawOfferParams {
  offerId: number; // onChainId
}

export function useWithdrawOffer() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const withdrawOffer = async ({ offerId }: WithdrawOfferParams) => {
    if (!address) {
      throw new Error('Wallet is not connected');
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      const hash = await writeContractAsync({
        address: OFFERS_ADDRESS,
        abi: OffersAbi,
        functionName: 'withdrawExpired',
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
    withdrawOffer,
    isLoading,
    error,
    txHash,
  };
}
