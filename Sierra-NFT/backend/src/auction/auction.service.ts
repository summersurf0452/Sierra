import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Auction } from '../database/entities/auction.entity';
import { Bid } from '../database/entities/bid.entity';
import { AuctionStatus } from '../database/entities/enums';
import { Nft } from '../database/entities/nft.entity';
import { PAGINATION_DEFAULTS } from '../common/pagination.config';

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
  ) {}

  /**
   * Active auction list (pagination, endTime descending)
   */
  async findAll(
    page = 1,
    limit = PAGINATION_DEFAULTS.auctions,
  ): Promise<{ data: Auction[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.auctionRepository.findAndCount({
      where: { status: AuctionStatus.ACTIVE },
      relations: ['nft', 'nft.collection'],
      skip: (page - 1) * limit,
      take: limit,
      order: { endTime: 'DESC' },
    });

    return { data, total, page, limit };
  }

  /**
   * Auction details (including bids)
   */
  async findById(id: string): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { id },
      relations: ['nft', 'nft.collection', 'bids'],
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${id} not found`);
    }

    // Sort bids by amount descending (highest bid first)
    if (auction.bids) {
      auction.bids.sort((a, b) => {
        const amountA = BigInt(a.amount);
        const amountB = BigInt(b.amount);
        if (amountB > amountA) return 1;
        if (amountB < amountA) return -1;
        return 0;
      });
    }

    return auction;
  }

  /**
   * Find active auction for a specific NFT
   */
  async findByNFT(
    contractAddress: string,
    tokenId: string,
  ): Promise<Auction | null> {
    return this.auctionRepository.findOne({
      where: {
        contractAddress: contractAddress.toLowerCase(),
        tokenId,
        status: AuctionStatus.ACTIVE,
      },
      relations: ['nft', 'nft.collection', 'bids'],
    });
  }

  /**
   * List of auctions a specific address has participated in
   */
  async findByBidder(
    address: string,
    page = 1,
    limit = PAGINATION_DEFAULTS.auctions,
  ): Promise<{ data: Auction[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.auctionRepository
      .createQueryBuilder('auction')
      .innerJoin('auction.bids', 'bid', 'bid.bidder = :bidder', {
        bidder: address.toLowerCase(),
      })
      .leftJoinAndSelect('auction.nft', 'nft')
      .leftJoinAndSelect('nft.collection', 'collection')
      .orderBy('auction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Create auction entity from on-chain event
   */
  async createFromEvent(data: {
    onChainId: number;
    seller: string;
    contractAddress: string;
    tokenId: string;
    startPrice: string;
    minBidIncrement: string;
    endTime: Date;
    transactionHash: string;
  }): Promise<Auction> {
    const contractAddress = data.contractAddress.toLowerCase();
    const seller = data.seller.toLowerCase();

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
      this.logger.warn(`NFT lookup failed for auction: ${err.message}`);
    }

    const auction = this.auctionRepository.create({
      onChainId: data.onChainId,
      seller,
      nftId,
      contractAddress,
      tokenId: data.tokenId,
      startPrice: data.startPrice,
      minBidIncrement: data.minBidIncrement,
      endTime: data.endTime,
      transactionHash: data.transactionHash,
    });

    return this.auctionRepository.save(auction);
  }

  /**
   * Record new bid + update auction
   */
  async updateBid(
    auctionOnChainId: number,
    bidder: string,
    amount: string,
    txHash: string,
    blockNumber: string,
  ): Promise<Bid> {
    const auction = await this.auctionRepository.findOne({
      where: { onChainId: auctionOnChainId },
    });

    if (!auction) {
      throw new NotFoundException(
        `Auction with onChainId ${auctionOnChainId} not found`,
      );
    }

    // Create Bid entity
    const bid = this.bidRepository.create({
      auctionId: auction.id,
      bidder: bidder.toLowerCase(),
      amount,
      transactionHash: txHash,
      blockNumber,
    });

    const savedBid = await this.bidRepository.save(bid);

    // Update Auction fields
    auction.highestBidder = bidder.toLowerCase();
    auction.highestBid = amount;
    auction.bidCount += 1;
    await this.auctionRepository.save(auction);

    return savedBid;
  }

  /**
   * Change auction status to SETTLED
   */
  async settle(onChainId: number): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { onChainId },
    });

    if (!auction) {
      throw new NotFoundException(
        `Auction with onChainId ${onChainId} not found`,
      );
    }

    auction.status = AuctionStatus.SETTLED;
    return this.auctionRepository.save(auction);
  }

  /**
   * Change auction status to CANCELED
   */
  async cancel(onChainId: number): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { onChainId },
    });

    if (!auction) {
      throw new NotFoundException(
        `Auction with onChainId ${onChainId} not found`,
      );
    }

    auction.status = AuctionStatus.CANCELED;
    return this.auctionRepository.save(auction);
  }

  /**
   * Settlement target: status = ACTIVE AND endTime <= (now - 2min buffer)
   * Blockchain block.timestamp may lag behind server time, so we allow margin.
   */
  async findExpiredActive(): Promise<Auction[]> {
    return this.auctionRepository.find({
      where: {
        status: AuctionStatus.ACTIVE,
        endTime: LessThanOrEqual(new Date()),
      },
    });
  }

  /**
   * Update endTime (reflect anti-sniping extension)
   */
  async updateEndTime(auctionId: string, newEndTime: Date): Promise<void> {
    await this.auctionRepository.update(auctionId, { endTime: newEndTime });
  }
}
