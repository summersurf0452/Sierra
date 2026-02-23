import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing, Nft, BlockchainEvent } from '../../database/entities';
import { ListingStatus } from '../../database/entities/listing.entity';
import { EventName } from '../../database/entities/blockchain-event.entity';

@Injectable()
export class Marketplace1155Handler {
  private readonly logger = new Logger(Marketplace1155Handler.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    @InjectRepository(BlockchainEvent)
    private readonly blockchainEventRepository: Repository<BlockchainEvent>,
  ) {}

  /**
   * Handle Listing1155Created event
   */
  async handleListing1155Created(log: any) {
    const { listingId, seller, nftContract, tokenId, amount, pricePerUnit } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `Listing1155Created: listingId=${listingId}, seller=${seller}, tokenId=${tokenId}, amount=${amount}`,
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

      // Calculate total price: amount * pricePerUnit
      const totalPrice = (BigInt(amount) * BigInt(pricePerUnit)).toString();

      // Update if existing listing found (frontend POST and indexer dual-path)
      const existing = await this.listingRepository.findOne({
        where: {
          contractAddress: nftContract.toLowerCase(),
          tokenId: tokenId.toString(),
          status: ListingStatus.ACTIVE,
          contractType: 'ERC1155',
        },
      });

      if (existing) {
        existing.onChainListingId = Number(listingId);
        existing.amount = Number(amount);
        existing.pricePerUnit = pricePerUnit.toString();
        existing.price = totalPrice;
        if (nft?.id && !existing.nftId) existing.nftId = nft.id;
        await this.listingRepository.save(existing);
      } else {
        const listing = this.listingRepository.create({
          nftId: nft?.id || null,
          seller: seller.toLowerCase(),
          price: totalPrice,
          contractAddress: nftContract.toLowerCase(),
          tokenId: tokenId.toString(),
          status: ListingStatus.ACTIVE,
          blockNumber: blockNumber.toString(),
          transactionHash,
          amount: Number(amount),
          pricePerUnit: pricePerUnit.toString(),
          contractType: 'ERC1155',
          onChainListingId: Number(listingId),
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
        eventName: EventName.LISTING_1155_CREATED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          listingId: listingId.toString(),
          seller,
          nftContract,
          tokenId: tokenId.toString(),
          amount: amount.toString(),
          pricePerUnit: pricePerUnit.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`ERC-1155 listing created: onChainListingId=${listingId}`);
    } catch (error) {
      this.logger.error(
        `Listing1155Created handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle Listing1155Sold event
   */
  async handleListing1155Sold(log: any) {
    const { listingId, buyer, amount, totalPrice } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `Listing1155Sold: listingId=${listingId}, buyer=${buyer}, amount=${amount}, totalPrice=${totalPrice}`,
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

      // Match exact listing by onChainListingId
      let listing = await this.listingRepository.findOne({
        where: {
          onChainListingId: Number(listingId),
          contractType: 'ERC1155',
          status: ListingStatus.ACTIVE,
        },
      });

      // Fallback: legacy listing without onChainListingId
      if (!listing) {
        listing = await this.listingRepository.findOne({
          where: {
            contractType: 'ERC1155',
            status: ListingStatus.ACTIVE,
          },
          order: { createdAt: 'DESC' },
        });
      }

      if (!listing) {
        this.logger.error(`ACTIVE ERC-1155 listing not found: onChainListingId=${listingId}`);
        return;
      }

      // Decrease amount
      const soldAmount = Number(amount);
      listing.amount = (listing.amount || 0) - soldAmount;

      if (listing.amount <= 0) {
        listing.status = ListingStatus.SOLD;
        listing.buyer = buyer.toLowerCase();
        listing.soldAt = new Date();
        listing.amount = 0;
      }

      // Update total price (remaining amount * unit price)
      if (listing.pricePerUnit && listing.amount > 0) {
        listing.price = (BigInt(listing.pricePerUnit) * BigInt(listing.amount)).toString();
      }

      await this.listingRepository.save(listing);

      // Update NFT ownership (change to buyer when fully sold)
      if (listing.amount <= 0) {
        const nft = await this.nftRepository.findOne({
          where: {
            contractAddress: listing.contractAddress,
            tokenId: listing.tokenId,
          },
        });

        if (nft) {
          nft.owner = buyer.toLowerCase();
          await this.nftRepository.save(nft);
          this.logger.log(`NFT ownership updated: tokenId=${listing.tokenId}, newOwner=${buyer}`);
        } else {
          this.logger.warn(
            `NFT not found for ownership update: contract=${listing.contractAddress}, tokenId=${listing.tokenId}`,
          );
        }
      }

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.LISTING_1155_SOLD,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          listingId: listingId.toString(),
          buyer,
          amount: amount.toString(),
          totalPrice: totalPrice.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(
        `ERC-1155 listing sold: amount sold=${soldAmount}, remaining=${listing.amount}`,
      );
    } catch (error) {
      this.logger.error(
        `Listing1155Sold handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle Listing1155Canceled event
   */
  async handleListing1155Canceled(log: any) {
    const { listingId } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(`Listing1155Canceled: listingId=${listingId}`);

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

      // Cancel by matching exact listing via onChainListingId
      let result = await this.listingRepository.update(
        {
          onChainListingId: Number(listingId),
          contractType: 'ERC1155',
          status: ListingStatus.ACTIVE,
        },
        { status: ListingStatus.CANCELED },
      );

      // Fallback: legacy listing without onChainListingId
      if (result.affected === 0) {
        result = await this.listingRepository.update(
          {
            contractType: 'ERC1155',
            status: ListingStatus.ACTIVE,
          },
          { status: ListingStatus.CANCELED },
        );
      }

      if (result.affected === 0) {
        this.logger.warn(`ACTIVE ERC-1155 listing not found: onChainListingId=${listingId}`);
      }

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.LISTING_1155_CANCELED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          listingId: listingId.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`ERC-1155 listing canceled: affected=${result.affected}`);
    } catch (error) {
      this.logger.error(
        `Listing1155Canceled handling failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
