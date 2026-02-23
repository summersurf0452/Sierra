import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer, Nft, BlockchainEvent } from '../../database/entities';
import { OfferStatus } from '../../database/entities/enums';
import { EventName } from '../../database/entities/blockchain-event.entity';

@Injectable()
export class OfferHandler {
  private readonly logger = new Logger(OfferHandler.name);

  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    @InjectRepository(BlockchainEvent)
    private readonly blockchainEventRepository: Repository<BlockchainEvent>,
  ) {}

  /**
   * Handle OfferCreated event
   */
  async handleOfferCreated(log: any) {
    const { offerId, offerer, nftContract, tokenId, price, expiresAt } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `OfferCreated: offerId=${offerId}, offerer=${offerer}, nftContract=${nftContract}, tokenId=${tokenId}`,
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

      // Create Offer entity
      const offer = this.offerRepository.create({
        onChainId: Number(offerId),
        offerer: offerer.toLowerCase(),
        nftId: nft?.id || null,
        contractAddress: nftContract.toLowerCase(),
        tokenId: tokenId.toString(),
        price: price.toString(),
        expiresAt: new Date(Number(expiresAt) * 1000),
        status: OfferStatus.ACTIVE,
        transactionHash,
      });

      await this.offerRepository.save(offer);

      if (!nft) {
        this.logger.warn(
          `NFT not found for offer: contract=${nftContract}, tokenId=${tokenId}`,
        );
      }

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.OFFER_CREATED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          offerId: offerId.toString(),
          offerer,
          nftContract,
          tokenId: tokenId.toString(),
          price: price.toString(),
          expiresAt: expiresAt.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Offer created: ID=${offer.id}, onChainId=${offerId}`);
    } catch (error) {
      this.logger.error(
        `OfferCreated handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle OfferAccepted event
   */
  async handleOfferAccepted(log: any) {
    const { offerId, seller } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(`OfferAccepted: offerId=${offerId}, seller=${seller}`);

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

      // Look up Offer and update status
      const offer = await this.offerRepository.findOne({
        where: { onChainId: Number(offerId) },
      });

      if (!offer) {
        this.logger.error(`Offer not found: onChainId=${offerId}`);
        return;
      }

      offer.status = OfferStatus.ACCEPTED;
      await this.offerRepository.save(offer);

      // Update NFT ownership (offerer becomes new owner)
      if (offer.nftId) {
        const nft = await this.nftRepository.findOne({
          where: { id: offer.nftId },
        });
        if (nft) {
          nft.owner = offer.offerer;
          await this.nftRepository.save(nft);
          this.logger.log(`NFT ownership updated: tokenId=${offer.tokenId}, newOwner=${offer.offerer}`);
        }
      }

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.OFFER_ACCEPTED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          offerId: offerId.toString(),
          seller,
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Offer accepted: offerId=${offerId}`);
    } catch (error) {
      this.logger.error(
        `OfferAccepted handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle OfferCanceled event
   */
  async handleOfferCanceled(log: any) {
    const { offerId } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(`OfferCanceled: offerId=${offerId}`);

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

      // Look up Offer and update status
      const offer = await this.offerRepository.findOne({
        where: { onChainId: Number(offerId) },
      });

      if (!offer) {
        this.logger.error(`Offer not found: onChainId=${offerId}`);
        return;
      }

      offer.status = OfferStatus.CANCELED;
      await this.offerRepository.save(offer);

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.OFFER_CANCELED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          offerId: offerId.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Offer canceled: offerId=${offerId}`);
    } catch (error) {
      this.logger.error(
        `OfferCanceled handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle OfferWithdrawn event
   */
  async handleOfferWithdrawn(log: any) {
    const { offerId } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(`OfferWithdrawn: offerId=${offerId}`);

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

      // Look up Offer and update status
      const offer = await this.offerRepository.findOne({
        where: { onChainId: Number(offerId) },
      });

      if (!offer) {
        this.logger.error(`Offer not found: onChainId=${offerId}`);
        return;
      }

      offer.status = OfferStatus.WITHDRAWN;
      await this.offerRepository.save(offer);

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.OFFER_WITHDRAWN,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: {
          offerId: offerId.toString(),
        },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`Offer withdrawn: offerId=${offerId}`);
    } catch (error) {
      this.logger.error(
        `OfferWithdrawn handling failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
