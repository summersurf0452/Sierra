import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing, BlockchainEvent, Nft } from '../../database/entities';
import { EventName } from '../../database/entities/blockchain-event.entity';
import { ListingStatus } from '../../database/entities/listing.entity';

@Injectable()
export class MarketplaceHandler {
  private readonly logger = new Logger(MarketplaceHandler.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    @InjectRepository(BlockchainEvent)
    private readonly blockchainEventRepository: Repository<BlockchainEvent>,
  ) {}

  /**
   * Handle ListingCreated event
   */
  async handleListingCreated(log: any) {
    const { seller, nftContract, tokenId, price } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `ListingCreated: seller=${seller}, nftContract=${nftContract}, tokenId=${tokenId}, price=${price}`,
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

      // Look up NFT to set actual nftId
      const nft = await this.nftRepository.findOne({
        where: {
          contractAddress: nftContract.toLowerCase(),
          tokenId: tokenId.toString(),
        },
      });

      // Upsert: may have been registered from frontend first
      const existing = await this.listingRepository.findOne({
        where: {
          contractAddress: nftContract.toLowerCase(),
          tokenId: tokenId.toString(),
          status: ListingStatus.ACTIVE,
        },
      });

      let listing;
      if (existing) {
        // Update existing listing (fill nftId)
        if (nft && !existing.nftId) existing.nftId = nft.id;
        existing.blockNumber = blockNumber.toString();
        existing.transactionHash = transactionHash;
        listing = await this.listingRepository.save(existing);
        this.logger.debug(`Listing already exists, updating: tokenId=${tokenId}`);
      } else {
        listing = this.listingRepository.create({
          nftId: nft?.id || null,
          seller: seller.toLowerCase(),
          price: price.toString(),
          contractAddress: nftContract.toLowerCase(),
          tokenId: tokenId.toString(),
          status: ListingStatus.ACTIVE,
          blockNumber: blockNumber.toString(),
          transactionHash,
        });
        await this.listingRepository.save(listing);
      }

      if (!nft) {
        this.logger.warn(
          `NFT not found for listing: contract=${nftContract}, tokenId=${tokenId}`,
        );
      }

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.LISTING_CREATED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          seller,
          nftContract,
          tokenId: tokenId.toString(),
          price: price.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Listing created: ID=${listing.id}`);
    } catch (error) {
      this.logger.error(
        `ListingCreated handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle ListingSold event
   */
  async handleListingSold(log: any) {
    const { buyer, nftContract, tokenId, price } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `ListingSold: buyer=${buyer}, nftContract=${nftContract}, tokenId=${tokenId}`,
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

      // Look up existing ACTIVE listing
      const listing = await this.listingRepository.findOne({
        where: {
          contractAddress: nftContract.toLowerCase(),
          tokenId: tokenId.toString(),
          status: ListingStatus.ACTIVE,
        },
        order: { createdAt: 'DESC' },
      });

      if (!listing) {
        this.logger.error(
          `ACTIVE listing not found: contract=${nftContract}, tokenId=${tokenId}`,
        );
        return;
      }

      // Update NFT ownership
      const nft = await this.nftRepository.findOne({
        where: {
          contractAddress: nftContract.toLowerCase(),
          tokenId: tokenId.toString(),
        },
      });

      if (nft) {
        nft.owner = buyer.toLowerCase();
        await this.nftRepository.save(nft);
        this.logger.log(`NFT ownership updated: tokenId=${tokenId}, newOwner=${buyer}`);
      } else {
        this.logger.warn(
          `NFT not found for ownership update: contract=${nftContract}, tokenId=${tokenId}`,
        );
      }

      // Update listing status
      listing.status = ListingStatus.SOLD;
      listing.buyer = buyer.toLowerCase();
      listing.soldAt = new Date();

      await this.listingRepository.save(listing);

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.LISTING_SOLD,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          buyer,
          nftContract,
          tokenId: tokenId.toString(),
          price: price.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Listing sold: ID=${listing.id}`);
    } catch (error) {
      this.logger.error(`ListingSold handling failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle ListingCanceled event
   */
  async handleListingCanceled(log: any) {
    const { seller, nftContract, tokenId } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `ListingCanceled: seller=${seller}, nftContract=${nftContract}, tokenId=${tokenId}`,
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

      // Cancel all ACTIVE listings for same NFT (handle dual-path duplication)
      const result = await this.listingRepository.update(
        {
          contractAddress: nftContract.toLowerCase(),
          tokenId: tokenId.toString(),
          status: ListingStatus.ACTIVE,
        },
        { status: ListingStatus.CANCELED },
      );

      if (result.affected === 0) {
        this.logger.warn(
          `ACTIVE listing not found: contract=${nftContract}, tokenId=${tokenId}`,
        );
      }

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.LISTING_CANCELED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          seller,
          nftContract,
          tokenId: tokenId.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Listing canceled: affected=${result.affected}`);
    } catch (error) {
      this.logger.error(
        `ListingCanceled handling failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
