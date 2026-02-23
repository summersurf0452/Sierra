import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Offer } from '../database/entities/offer.entity';
import { OfferStatus } from '../database/entities/enums';
import { Nft } from '../database/entities/nft.entity';
import { PAGINATION_DEFAULTS } from '../common/pagination.config';

@Injectable()
export class OfferService {
  private readonly logger = new Logger(OfferService.name);

  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
  ) {}

  /**
   * List of active offers for a specific NFT (price descending = highest offer first)
   */
  async findByNFT(
    contractAddress: string,
    tokenId: string,
  ): Promise<Offer[]> {
    return this.offerRepository
      .createQueryBuilder('offer')
      .where('offer.contractAddress = :contractAddress', {
        contractAddress: contractAddress.toLowerCase(),
      })
      .andWhere('offer.tokenId = :tokenId', { tokenId })
      .andWhere('offer.status = :status', { status: OfferStatus.ACTIVE })
      .addSelect('CAST(offer.price AS NUMERIC)', 'sort_price')
      .orderBy('sort_price', 'DESC')
      .getMany();
  }

  /**
   * List of offers sent by a specific user (all statuses)
   */
  async findByOfferer(
    address: string,
    page = 1,
    limit = PAGINATION_DEFAULTS.offers,
  ): Promise<{ data: Offer[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.offerRepository.findAndCount({
      where: { offerer: address.toLowerCase() },
      relations: ['nft', 'nft.collection'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  /**
   * Offer details
   */
  async findById(id: string): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { id },
      relations: ['nft', 'nft.collection'],
    });

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${id} not found`);
    }

    return offer;
  }

  /**
   * Find expired active offers
   */
  async findExpiredActive(): Promise<Offer[]> {
    return this.offerRepository.find({
      where: {
        status: OfferStatus.ACTIVE,
        expiresAt: LessThanOrEqual(new Date()),
      },
    });
  }

  /**
   * Create offer entity from on-chain event
   */
  async createFromEvent(data: {
    onChainId: number;
    offerer: string;
    contractAddress: string;
    tokenId: string;
    price: string;
    expiresAt: Date;
    transactionHash: string;
  }): Promise<Offer> {
    const contractAddress = data.contractAddress.toLowerCase();
    const offerer = data.offerer.toLowerCase();

    // NFT matching
    let nftId: string | null = null;
    try {
      const nft = await this.nftRepository.findOne({
        where: { contractAddress, tokenId: data.tokenId },
      });
      if (nft) {
        nftId = nft.id;
      }
    } catch (err) {
      this.logger.warn(`NFT lookup failed for offer: ${err.message}`);
    }

    const offer = this.offerRepository.create({
      onChainId: data.onChainId,
      offerer,
      nftId,
      contractAddress,
      tokenId: data.tokenId,
      price: data.price,
      expiresAt: data.expiresAt,
      transactionHash: data.transactionHash,
    });

    return this.offerRepository.save(offer);
  }

  /**
   * Change offer status to ACCEPTED
   */
  async accept(onChainId: number): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { onChainId },
    });

    if (!offer) {
      throw new NotFoundException(
        `Offer with onChainId ${onChainId} not found`,
      );
    }

    offer.status = OfferStatus.ACCEPTED;
    return this.offerRepository.save(offer);
  }

  /**
   * Change offer status to CANCELED
   */
  async cancel(onChainId: number): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { onChainId },
    });

    if (!offer) {
      throw new NotFoundException(
        `Offer with onChainId ${onChainId} not found`,
      );
    }

    offer.status = OfferStatus.CANCELED;
    return this.offerRepository.save(offer);
  }

  /**
   * Change offer status to WITHDRAWN
   */
  async withdraw(onChainId: number): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { onChainId },
    });

    if (!offer) {
      throw new NotFoundException(
        `Offer with onChainId ${onChainId} not found`,
      );
    }

    offer.status = OfferStatus.WITHDRAWN;
    return this.offerRepository.save(offer);
  }

  /**
   * Batch update expired ACTIVE offers to EXPIRED status
   */
  async markExpired(): Promise<number> {
    const result = await this.offerRepository
      .createQueryBuilder()
      .update(Offer)
      .set({ status: OfferStatus.EXPIRED })
      .where('status = :status', { status: OfferStatus.ACTIVE })
      .andWhere('expiresAt <= :now', { now: new Date() })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} expired offer(s)`);
    }

    return result.affected || 0;
  }

  /**
   * Return the single highest offer
   */
  async getHighestOffer(
    contractAddress: string,
    tokenId: string,
  ): Promise<Offer | null> {
    return this.offerRepository
      .createQueryBuilder('offer')
      .where('offer.contractAddress = :contractAddress', {
        contractAddress: contractAddress.toLowerCase(),
      })
      .andWhere('offer.tokenId = :tokenId', { tokenId })
      .andWhere('offer.status = :status', { status: OfferStatus.ACTIVE })
      .addSelect('CAST(offer.price AS NUMERIC)', 'sort_price')
      .orderBy('sort_price', 'DESC')
      .getOne();
  }
}
