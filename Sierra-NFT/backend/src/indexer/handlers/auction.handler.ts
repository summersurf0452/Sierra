import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auction, Bid, Nft, BlockchainEvent } from '../../database/entities';
import { AuctionStatus } from '../../database/entities/enums';
import { EventName } from '../../database/entities/blockchain-event.entity';

@Injectable()
export class AuctionHandler {
  private readonly logger = new Logger(AuctionHandler.name);

  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    @InjectRepository(BlockchainEvent)
    private readonly blockchainEventRepository: Repository<BlockchainEvent>,
  ) {}

  /**
   * Handle AuctionCreated event
   */
  async handleAuctionCreated(log: any) {
    const { auctionId, seller, nftContract, tokenId, startPrice, endTime } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `AuctionCreated: auctionId=${auctionId}, seller=${seller}, nftContract=${nftContract}, tokenId=${tokenId}`,
    );

    try {
      // Duplicate check
      const existingEvent = await this.blockchainEventRepository.findOne({
        where: {
          transactionHash,
          logIndex: Number(logIndex),
        },
      });

      if (existingEvent) {
        this.logger.debug(`Duplicate event detected: ${transactionHash}#${logIndex}`);
        return;
      }

      // Look up NFT to set nftId
      const nft = await this.nftRepository.findOne({
        where: {
          contractAddress: nftContract.toLowerCase(),
          tokenId: tokenId.toString(),
        },
      });

      // Create Auction entity
      const auction = this.auctionRepository.create({
        onChainId: Number(auctionId),
        seller: seller.toLowerCase(),
        nftId: nft?.id || null,
        contractAddress: nftContract.toLowerCase(),
        tokenId: tokenId.toString(),
        startPrice: startPrice.toString(),
        minBidIncrement: '0', // Auto-calculated by contract
        endTime: new Date(Number(endTime) * 1000),
        status: AuctionStatus.ACTIVE,
        transactionHash,
      });

      await this.auctionRepository.save(auction);

      if (!nft) {
        this.logger.warn(
          `NFT not found for auction: contract=${nftContract}, tokenId=${tokenId}`,
        );
      }

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.AUCTION_CREATED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          auctionId: auctionId.toString(),
          seller,
          nftContract,
          tokenId: tokenId.toString(),
          startPrice: startPrice.toString(),
          endTime: endTime.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Auction created: ID=${auction.id}, onChainId=${auctionId}`);
    } catch (error) {
      this.logger.error(
        `AuctionCreated handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle BidPlaced event
   */
  async handleBidPlaced(log: any) {
    const { auctionId, bidder, amount } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `BidPlaced: auctionId=${auctionId}, bidder=${bidder}, amount=${amount}`,
    );

    try {
      // Duplicate check
      const existingEvent = await this.blockchainEventRepository.findOne({
        where: {
          transactionHash,
          logIndex: Number(logIndex),
        },
      });

      if (existingEvent) {
        this.logger.debug(`Duplicate event detected: ${transactionHash}#${logIndex}`);
        return;
      }

      // Look up Auction
      const auction = await this.auctionRepository.findOne({
        where: { onChainId: Number(auctionId) },
      });

      if (!auction) {
        this.logger.error(`Auction not found: onChainId=${auctionId}`);
        return;
      }

      // Create Bid entity
      const bid = this.bidRepository.create({
        auctionId: auction.id,
        bidder: bidder.toLowerCase(),
        amount: amount.toString(),
        transactionHash,
        blockNumber: blockNumber.toString(),
      });

      await this.bidRepository.save(bid);

      // Update Auction highest bid
      auction.highestBidder = bidder.toLowerCase();
      auction.highestBid = amount.toString();
      auction.bidCount += 1;
      await this.auctionRepository.save(auction);

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.BID_PLACED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          auctionId: auctionId.toString(),
          bidder,
          amount: amount.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Bid recorded: auctionId=${auctionId}, bidder=${bidder}`);
    } catch (error) {
      this.logger.error(
        `BidPlaced handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle AuctionSettled event
   */
  async handleAuctionSettled(log: any) {
    const { auctionId, winner, amount } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `AuctionSettled: auctionId=${auctionId}, winner=${winner}, amount=${amount}`,
    );

    try {
      // Duplicate check
      const existingEvent = await this.blockchainEventRepository.findOne({
        where: {
          transactionHash,
          logIndex: Number(logIndex),
        },
      });

      if (existingEvent) {
        this.logger.debug(`Duplicate event detected: ${transactionHash}#${logIndex}`);
        return;
      }

      // Look up Auction and update status
      const auction = await this.auctionRepository.findOne({
        where: { onChainId: Number(auctionId) },
      });

      if (!auction) {
        this.logger.error(`Auction not found: onChainId=${auctionId}`);
        return;
      }

      auction.status = AuctionStatus.SETTLED;
      auction.highestBidder = winner.toLowerCase();
      auction.highestBid = amount.toString();
      await this.auctionRepository.save(auction);

      // Update NFT ownership
      if (auction.nftId) {
        const nft = await this.nftRepository.findOne({
          where: { id: auction.nftId },
        });
        if (nft) {
          nft.owner = winner.toLowerCase();
          await this.nftRepository.save(nft);
          this.logger.log(`NFT ownership updated: tokenId=${auction.tokenId}, newOwner=${winner}`);
        }
      }

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.AUCTION_SETTLED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          auctionId: auctionId.toString(),
          winner,
          amount: amount.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Auction settled: auctionId=${auctionId}`);
    } catch (error) {
      this.logger.error(
        `AuctionSettled handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle AuctionCanceled event
   */
  async handleAuctionCanceled(log: any) {
    const { auctionId } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(`AuctionCanceled: auctionId=${auctionId}`);

    try {
      // Duplicate check
      const existingEvent = await this.blockchainEventRepository.findOne({
        where: {
          transactionHash,
          logIndex: Number(logIndex),
        },
      });

      if (existingEvent) {
        this.logger.debug(`Duplicate event detected: ${transactionHash}#${logIndex}`);
        return;
      }

      // Look up Auction and update status
      const auction = await this.auctionRepository.findOne({
        where: { onChainId: Number(auctionId) },
      });

      if (!auction) {
        this.logger.error(`Auction not found: onChainId=${auctionId}`);
        return;
      }

      auction.status = AuctionStatus.CANCELED;
      await this.auctionRepository.save(auction);

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.AUCTION_CANCELED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          auctionId: auctionId.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Auction canceled: auctionId=${auctionId}`);
    } catch (error) {
      this.logger.error(
        `AuctionCanceled handling failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
