import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AuctionService } from './auction.service';
import { AuctionAbi } from '../common/abis/Auction.abi';
import { worldlandMainnet } from '../common/chains';

@Injectable()
export class AuctionSettlementService {
  private readonly logger = new Logger(AuctionSettlementService.name);

  constructor(private readonly auctionService: AuctionService) {}

  /**
   * Runs every minute: detects expired auctions and calls on-chain settleAuction.
   * Since on-chain endTime may be extended due to anti-sniping,
   * the on-chain endTime is checked and synced to DB before settlement.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async settleExpiredAuctions(): Promise<void> {
    const settlementKey = process.env.SETTLEMENT_PRIVATE_KEY;
    if (!settlementKey) {
      this.logger.warn(
        'SETTLEMENT_PRIVATE_KEY not set. Skipping auction settlement.',
      );
      return;
    }

    const auctionAddress = process.env.AUCTION_ADDRESS;
    if (!auctionAddress) {
      this.logger.warn(
        'AUCTION_ADDRESS not set. Skipping auction settlement.',
      );
      return;
    }

    const expiredAuctions = await this.auctionService.findExpiredActive();

    if (expiredAuctions.length === 0) {
      return;
    }

    this.logger.log(
      `Found ${expiredAuctions.length} expired auction(s) to settle`,
    );

    const account = privateKeyToAccount(
      settlementKey as `0x${string}`,
    );

    const publicClient = createPublicClient({
      chain: worldlandMainnet,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: worldlandMainnet,
      transport: http(),
    });

    for (const auction of expiredAuctions) {
      try {
        // Check on-chain endTime (may have been extended due to anti-sniping)
        const onChainAuction = (await (publicClient as any).readContract({
          address: auctionAddress as `0x${string}`,
          abi: AuctionAbi,
          functionName: 'auctions',
          args: [BigInt(auction.onChainId)],
        })) as any[];

        // auctions mapping return order: seller, nftContract, tokenId, startPrice, minBidIncrement, endTime, highestBidder, highestBid, settled, canceled
        const onChainEndTime = Number(onChainAuction[5]);
        const nowUnix = Math.floor(Date.now() / 1000);
        // Allow 30-second buffer for transaction propagation time
        const SETTLE_BUFFER = 30;

        if (nowUnix < onChainEndTime + SETTLE_BUFFER) {
          // On-chain endTime + buffer has not yet passed
          if (nowUnix < onChainEndTime) {
            // Update DB endTime as well (anti-sniping extension)
            const newEndTime = new Date(onChainEndTime * 1000);
            this.logger.log(
              `Auction ${auction.onChainId}: on-chain endTime=${new Date(onChainEndTime * 1000).toISOString()}, waiting for buffer`,
            );
            await this.auctionService.updateEndTime(auction.id, newEndTime);
          } else {
            this.logger.log(
              `Auction ${auction.onChainId}: on-chain expired, waiting for block.timestamp sync (${nowUnix - onChainEndTime}s elapsed)`,
            );
          }
          continue;
        }

        const hash = await walletClient.writeContract({
          account,
          chain: worldlandMainnet,
          address: auctionAddress as `0x${string}`,
          abi: AuctionAbi,
          functionName: 'settleAuction',
          args: [BigInt(auction.onChainId)],
        });

        this.logger.log(
          `Auction ${auction.id} (onChainId: ${auction.onChainId}) settlement tx: ${hash}`,
        );
      } catch (error) {
        this.logger.error(
          `Settlement failed for auction ${auction.id} (onChainId: ${auction.onChainId}): ${error.message}`,
        );
      }
    }
  }
}
