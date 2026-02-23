import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nft } from '../database/entities/nft.entity';
import { ContractType } from '../database/entities/collection.entity';
import { BlockchainEvent } from '../database/entities/blockchain-event.entity';
import { PAGINATION_DEFAULTS } from '../common/pagination.config';

export interface RegisterMintDto {
  tokenId: string;
  collectionId: string;
  owner: string;
  tokenURI: string;
  contractAddress: string;
  contractType: ContractType;
  supply?: number;
  name?: string;
  description?: string;
  imageUrl?: string;
}

@Injectable()
export class NftService {
  constructor(
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    @InjectRepository(BlockchainEvent)
    private readonly blockchainEventRepository: Repository<BlockchainEvent>,
  ) {}

  async findAll(
    filters: {
      owner?: string;
      collectionId?: string;
      contractAddress?: string;
      contractType?: 'ERC721' | 'ERC1155';
    } = {},
    page = 1,
    limit = PAGINATION_DEFAULTS.explore,
  ): Promise<{ data: Nft[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.nftRepository.createQueryBuilder('nft');

    // Public-facing: exclude hidden NFTs and NFTs in hidden collections
    queryBuilder.andWhere('nft.isHidden = :nftHidden', { nftHidden: false });

    if (filters.owner) {
      queryBuilder.andWhere('nft.owner = :owner', { owner: filters.owner.toLowerCase() });
    }

    if (filters.collectionId) {
      queryBuilder.andWhere('nft.collectionId = :collectionId', { collectionId: filters.collectionId });
    }

    if (filters.contractAddress) {
      queryBuilder.andWhere('nft.contractAddress = :contractAddress', {
        contractAddress: filters.contractAddress.toLowerCase(),
      });
    }

    if (filters.contractType) {
      queryBuilder.andWhere('nft.contractType = :contractType', {
        contractType: filters.contractType,
      });
    }

    const [data, total] = await queryBuilder
      .leftJoinAndSelect('nft.collection', 'collection')
      .andWhere('collection.isHidden = :colHidden', { colHidden: false })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('nft.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<Nft> {
    const nft = await this.nftRepository.findOne({
      where: { id },
      relations: ['collection', 'listings'],
    });

    if (!nft) {
      throw new NotFoundException(`NFT with ID ${id} not found`);
    }

    return nft;
  }

  async findByOwner(
    owner: string,
    page = 1,
    limit = PAGINATION_DEFAULTS.profile_nfts,
  ): Promise<{ data: Nft[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.nftRepository.findAndCount({
      where: { owner: owner.toLowerCase() },
      relations: ['collection'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findByCreator(
    creator: string,
    page = 1,
    limit = PAGINATION_DEFAULTS.profile_nfts,
  ): Promise<{ data: Nft[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.nftRepository
      .createQueryBuilder('nft')
      .leftJoinAndSelect('nft.collection', 'collection')
      .where('collection.creator = :creator', { creator: creator.toLowerCase() })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('nft.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findFiltered(
    filters: {
      collectionId?: string;
      minPrice?: string;
      maxPrice?: string;
      status?: 'listed' | 'unlisted' | 'all';
      category?: string;
      search?: string;
      sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popularity';
    },
    page = 1,
    limit = PAGINATION_DEFAULTS.explore,
  ): Promise<{ data: Nft[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.nftRepository
      .createQueryBuilder('nft')
      .leftJoinAndSelect('nft.collection', 'collection')
      .leftJoin(
        'nft.listings',
        'listing',
        'listing.status = :activeStatus',
        { activeStatus: 'ACTIVE' },
      );

    // Public-facing: exclude hidden NFTs and NFTs in hidden collections
    queryBuilder.andWhere('nft.isHidden = :nftHidden', { nftHidden: false });
    queryBuilder.andWhere('collection.isHidden = :colHidden', { colHidden: false });

    if (filters.collectionId) {
      queryBuilder.andWhere('nft.collectionId = :cid', {
        cid: filters.collectionId,
      });
    }

    if (filters.status === 'listed') {
      queryBuilder.andWhere('listing.id IS NOT NULL');
    } else if (filters.status === 'unlisted') {
      queryBuilder.andWhere('listing.id IS NULL');
    }

    if (filters.minPrice) {
      queryBuilder.andWhere(
        'CAST(listing.price AS NUMERIC) >= CAST(:minPrice AS NUMERIC)',
        { minPrice: filters.minPrice },
      );
    }

    if (filters.maxPrice) {
      queryBuilder.andWhere(
        'CAST(listing.price AS NUMERIC) <= CAST(:maxPrice AS NUMERIC)',
        { maxPrice: filters.maxPrice },
      );
    }

    if (filters.category) {
      queryBuilder.andWhere('collection.category = :category', {
        category: filters.category,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(nft.name ILIKE :q OR collection.name ILIKE :q)',
        { q: '%' + filters.search + '%' },
      );
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price_asc':
        queryBuilder
          .addSelect('CAST(listing.price AS NUMERIC)', 'sort_price')
          .orderBy('sort_price', 'ASC', 'NULLS LAST');
        break;
      case 'price_desc':
        queryBuilder
          .addSelect('CAST(listing.price AS NUMERIC)', 'sort_price')
          .orderBy('sort_price', 'DESC', 'NULLS LAST');
        break;
      case 'popularity':
        queryBuilder
          .addSelect(
            (subQuery) =>
              subQuery
                .select('COUNT(sl.id)')
                .from('listings', 'sl')
                .where('sl.nftId = nft.id')
                .andWhere("sl.status = 'SOLD'"),
            'sold_count',
          )
          .orderBy('sold_count', 'DESC');
        break;
      case 'newest':
      default:
        queryBuilder.orderBy('nft.createdAt', 'DESC');
        break;
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async getActivity(
    nftId: string,
    filters?: { eventType?: string },
    page = 1,
    limit = PAGINATION_DEFAULTS.profile_activity,
  ) {
    const nft = await this.nftRepository.findOne({ where: { id: nftId } });
    if (!nft) {
      throw new NotFoundException(`NFT with ID ${nftId} not found`);
    }

    const queryBuilder = this.blockchainEventRepository
      .createQueryBuilder('event')
      .where(
        '(' +
          "(event.args->>'tokenId' = :tokenId AND event.contractAddress = :contractAddress)" +
          ' OR ' +
          "(event.args->>'nftContract' = :contractAddress AND event.args->>'tokenId' = :tokenId)" +
          ')',
        {
          tokenId: nft.tokenId,
          contractAddress: nft.contractAddress,
        },
      );

    if (filters?.eventType) {
      const displayToEnum: Record<string, string[]> = {
        Mint: ['NFTMinted'],
        List: ['ListingCreated', 'Listing1155Created'],
        Sale: ['ListingSold', 'Listing1155Sold'],
        Cancel: ['ListingCanceled', 'Listing1155Canceled'],
      };
      const enumValues = displayToEnum[filters.eventType];
      if (enumValues) {
        queryBuilder.andWhere('event.eventName IN (:...eventNames)', {
          eventNames: enumValues,
        });
      } else {
        queryBuilder.andWhere('event.eventName = :eventName', {
          eventName: filters.eventType,
        });
      }
    }

    const [events, total] = await queryBuilder
      .orderBy('event.blockNumber', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = events.map((event) => {
      const args = event.args || {};
      let eventType: string;
      let from: string | null = null;
      let to: string | null = null;
      let price: string | null = null;

      switch (event.eventName) {
        case 'NFTMinted':
          eventType = 'Mint';
          from = null;
          to = args.owner || args.to || null;
          break;
        case 'ListingCreated':
        case 'Listing1155Created':
          eventType = 'List';
          from = args.seller || null;
          to = null;
          price = args.price || args.pricePerUnit || null;
          break;
        case 'ListingSold':
        case 'Listing1155Sold':
          eventType = 'Sale';
          from = args.seller || null;
          to = args.buyer || null;
          price = args.price || args.totalPrice || null;
          break;
        case 'ListingCanceled':
        case 'Listing1155Canceled':
          eventType = 'Cancel';
          from = args.seller || null;
          to = null;
          break;
        default:
          eventType = 'Transfer';
          from = args.from || null;
          to = args.to || null;
          break;
      }

      return {
        id: event.id,
        eventType,
        price,
        from,
        to,
        timestamp: event.createdAt?.toISOString() || '',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      };
    });

    return { data, total, page, limit };
  }

  async registerMint(registerMintDto: RegisterMintDto): Promise<Nft> {
    const { tokenId, contractAddress, ...rest } = registerMintDto;

    // Upsert pattern: update existing NFT if found, otherwise create new
    const existing = await this.nftRepository.findOne({
      where: {
        tokenId,
        contractAddress: contractAddress.toLowerCase(),
      },
    });

    if (existing) {
      // Update existing NFT
      Object.assign(existing, {
        ...rest,
        owner: rest.owner.toLowerCase(),
      });
      const saved = await this.nftRepository.save(existing);
      return saved;
    }

    // Create new NFT
    const nft = this.nftRepository.create({
      ...rest,
      tokenId,
      contractAddress: contractAddress.toLowerCase(),
      owner: rest.owner.toLowerCase(),
    });

    return await this.nftRepository.save(nft);
  }
}
