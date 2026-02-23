import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing, ListingStatus } from '../database/entities/listing.entity';
import { Nft } from '../database/entities/nft.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { PAGINATION_DEFAULTS } from '../common/pagination.config';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
  ) {}

  async findActive(
    page = 1,
    limit = PAGINATION_DEFAULTS.home_latest,
    sort: 'newest' | 'price_asc' | 'price_desc' = 'newest',
    contractType?: 'ERC721' | 'ERC1155',
  ): Promise<{ data: Listing[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.nft', 'nft')
      .leftJoinAndSelect('nft.collection', 'collection')
      .where('listing.status = :status', { status: ListingStatus.ACTIVE })
      // Exclude listings for hidden NFTs and NFTs in hidden collections
      .andWhere('(nft.isHidden = :nftHidden OR nft.id IS NULL)', { nftHidden: false })
      .andWhere('(collection.isHidden = :colHidden OR collection.id IS NULL)', { colHidden: false });

    if (contractType) {
      queryBuilder.andWhere('listing.contractType = :contractType', { contractType });
    }

    if (sort === 'price_asc' || sort === 'price_desc') {
      queryBuilder
        .addSelect('CAST(listing.price AS NUMERIC)', 'sort_price')
        .orderBy(
          'sort_price',
          sort === 'price_asc' ? 'ASC' : 'DESC',
          'NULLS LAST',
        );
    } else {
      queryBuilder.orderBy('listing.createdAt', 'DESC');
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async find1155Listings(
    page = 1,
    limit = PAGINATION_DEFAULTS.home_latest,
  ): Promise<{ data: Listing[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.nft', 'nft')
      .leftJoinAndSelect('nft.collection', 'collection')
      .where('listing.status = :status', { status: ListingStatus.ACTIVE })
      .andWhere('listing.contractType = :contractType', { contractType: 'ERC1155' })
      .andWhere('(nft.isHidden = :nftHidden OR nft.id IS NULL)', { nftHidden: false })
      .andWhere('(collection.isHidden = :colHidden OR collection.id IS NULL)', { colHidden: false })
      .orderBy('listing.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async updateAmount(listingId: string, soldAmount: number): Promise<Listing> {
    const listing = await this.listingRepository.findOne({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException(`Listing with ID ${listingId} not found`);
    }

    listing.amount = (listing.amount || 0) - soldAmount;

    if (listing.amount <= 0) {
      listing.status = ListingStatus.SOLD;
      listing.amount = 0;
      listing.soldAt = new Date();
    }

    // Update total price based on remaining amount
    if (listing.pricePerUnit && listing.amount > 0) {
      listing.price = (BigInt(listing.pricePerUnit) * BigInt(listing.amount)).toString();
    }

    return this.listingRepository.save(listing);
  }

  async findByNft(
    contractAddress: string,
    tokenId: string,
  ): Promise<Listing | null> {
    return this.listingRepository.findOne({
      where: {
        contractAddress: contractAddress.toLowerCase(),
        tokenId,
        status: ListingStatus.ACTIVE,
      },
      relations: ['nft', 'nft.collection'],
    });
  }

  async findBySeller(
    seller: string,
    page = 1,
    limit = PAGINATION_DEFAULTS.profile_activity,
  ): Promise<{ data: Listing[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.listingRepository.findAndCount({
      where: { seller: seller.toLowerCase() },
      relations: ['nft', 'nft.collection'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findByBuyer(
    buyer: string,
    page = 1,
    limit = PAGINATION_DEFAULTS.profile_activity,
  ): Promise<{ data: Listing[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.listingRepository.findAndCount({
      where: {
        buyer: buyer.toLowerCase(),
        status: ListingStatus.SOLD,
      },
      relations: ['nft', 'nft.collection'],
      skip: (page - 1) * limit,
      take: limit,
      order: { soldAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async register(createListingDto: CreateListingDto): Promise<Listing> {
    const contractAddress = createListingDto.contractAddress.toLowerCase();
    const { tokenId } = createListingDto;

    // Look up NFT to set nftId
    let nftId: string | null = null;
    try {
      const nft = await this.nftRepository.findOne({
        where: { contractAddress, tokenId },
      });
      if (nft) {
        nftId = nft.id;
      } else {
        this.logger.warn(
          `NFT not found for listing: contract=${contractAddress}, tokenId=${tokenId}`,
        );
      }
    } catch (err) {
      this.logger.error(`Failed to lookup NFT for listing: ${err.message}`);
    }

    // Update if an existing ACTIVE listing exists (handles dual indexer/frontend paths)
    const existing = await this.listingRepository.findOne({
      where: { contractAddress, tokenId, status: ListingStatus.ACTIVE },
    });

    if (existing) {
      existing.price = createListingDto.price;
      existing.seller = createListingDto.seller.toLowerCase();
      existing.transactionHash = createListingDto.transactionHash;
      existing.blockNumber = createListingDto.blockNumber;
      if (nftId && !existing.nftId) existing.nftId = nftId;
      return this.listingRepository.save(existing);
    }

    const listing = this.listingRepository.create({
      ...createListingDto,
      contractAddress,
      seller: createListingDto.seller.toLowerCase(),
      nftId,
      status: ListingStatus.ACTIVE,
    });

    return this.listingRepository.save(listing);
  }

  async markSold(id: string, buyer: string): Promise<Listing> {
    const listing = await this.listingRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    listing.status = ListingStatus.SOLD;
    listing.buyer = buyer.toLowerCase();
    listing.soldAt = new Date();

    return this.listingRepository.save(listing);
  }

  async markCanceled(id: string): Promise<Listing> {
    const listing = await this.listingRepository.findOne({ where: { id } });
    if (!listing) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    // Cancel all ACTIVE listings for the same NFT (handles duplicate dual-path entries)
    await this.listingRepository.update(
      {
        contractAddress: listing.contractAddress,
        tokenId: listing.tokenId,
        status: ListingStatus.ACTIVE,
      },
      { status: ListingStatus.CANCELED },
    );

    // Return latest state
    return this.listingRepository.findOne({ where: { id } });
  }

  async getActivity(
    address: string,
    page = 1,
    limit = PAGINATION_DEFAULTS.profile_activity,
  ): Promise<{ data: Listing[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.nft', 'nft')
      .leftJoinAndSelect('nft.collection', 'collection')
      .where('listing.seller = :address', { address: address.toLowerCase() })
      .orWhere('listing.buyer = :address', { address: address.toLowerCase() })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('listing.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }
}
