import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../database/entities/collection.entity';
import { Nft } from '../database/entities/nft.entity';
import { Listing } from '../database/entities/listing.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { PAGINATION_DEFAULTS } from '../common/pagination.config';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) {}

  async findAll(page = 1, limit = PAGINATION_DEFAULTS.explore): Promise<{ data: Collection[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.collectionRepository.findAndCount({
      where: { isHidden: false },
      skip: (page - 1) * limit,
      take: limit,
      order: { isVerified: 'DESC', createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }
    return collection;
  }

  async findByCreator(creator: string, page = 1, limit = PAGINATION_DEFAULTS.profile_nfts): Promise<{ data: Collection[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.collectionRepository.findAndCount({
      where: { creator: creator.toLowerCase() },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async create(createCollectionDto: CreateCollectionDto): Promise<Collection> {
    const collection = this.collectionRepository.create({
      ...createCollectionDto,
      creator: createCollectionDto.creator.toLowerCase(),
      contractAddress: createCollectionDto.contractAddress.toLowerCase(),
    });

    return this.collectionRepository.save(collection);
  }

  async update(id: string, updateData: Partial<CreateCollectionDto>): Promise<Collection> {
    const collection = await this.findById(id);

    Object.assign(collection, updateData);

    return this.collectionRepository.save(collection);
  }

  async getTrending(limit = PAGINATION_DEFAULTS.home_trending) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const results = await this.collectionRepository
      .createQueryBuilder('collection')
      .leftJoin('collection.nfts', 'nft')
      .leftJoin(
        'nft.listings',
        'listing',
        'listing.status = :soldStatus AND listing.soldAt > :sevenDaysAgo',
        { soldStatus: 'SOLD', sevenDaysAgo },
      )
      .where('collection.isHidden = :hidden', { hidden: false })
      .select([
        'collection.id AS id',
        'collection.name AS name',
        'collection.symbol AS symbol',
        'collection.coverImageUrl AS "coverImageUrl"',
        'collection.category AS category',
        'collection.contractAddress AS "contractAddress"',
        'collection.contractType AS "contractType"',
        'collection.creator AS creator',
        'collection.createdAt AS "createdAt"',
        'collection.isVerified AS "isVerified"',
        'COUNT(DISTINCT listing.id) AS "salesCount"',
        'COALESCE(SUM(CAST(listing.price AS NUMERIC)), 0) AS "totalVolume"',
      ])
      .groupBy('collection.id')
      .orderBy('collection.isVerified', 'DESC')
      .addOrderBy('"salesCount"', 'DESC')
      .limit(limit)
      .getRawMany();

    // Cold start fallback: if all results have salesCount=0, show newest collections with NFTs
    const hasAnySales = results.some(
      (r) => Number(r.salesCount) > 0,
    );

    if (!hasAnySales) {
      const fallback = await this.collectionRepository
        .createQueryBuilder('collection')
        .leftJoin('collection.nfts', 'nft')
        .where('collection.isHidden = :hidden', { hidden: false })
        .select([
          'collection.id AS id',
          'collection.name AS name',
          'collection.symbol AS symbol',
          'collection.coverImageUrl AS "coverImageUrl"',
          'collection.category AS category',
          'collection.contractAddress AS "contractAddress"',
          'collection.contractType AS "contractType"',
          'collection.creator AS creator',
          'collection.createdAt AS "createdAt"',
          'collection.isVerified AS "isVerified"',
          'COUNT(nft.id) AS "nftCount"',
        ])
        .groupBy('collection.id')
        .having('COUNT(nft.id) > 0')
        .orderBy('collection.isVerified', 'DESC')
        .addOrderBy('collection.createdAt', 'DESC')
        .limit(limit)
        .getRawMany();

      return fallback.map((r) => ({
        ...r,
        salesCount: '0',
        totalVolume: '0',
      }));
    }

    return results.map((r) => ({
      ...r,
      salesCount: String(r.salesCount),
      totalVolume: String(r.totalVolume),
    }));
  }

  async getCollectionDetail(id: string) {
    const collection = await this.collectionRepository.findOne({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    // Query stats from nft repository
    const stats = await this.nftRepository
      .createQueryBuilder('nft')
      .leftJoin(
        'nft.listings',
        'listing',
        'listing.status = :activeStatus',
        { activeStatus: 'ACTIVE' },
      )
      .select([
        'COUNT(DISTINCT nft.id) AS "totalSupply"',
        'COUNT(DISTINCT nft.owner) AS "ownerCount"',
        'MIN(CAST(listing.price AS NUMERIC)) AS "floorPrice"',
      ])
      .where('nft.collectionId = :id', { id })
      .getRawOne();

    // Query total volume from sold listings
    const volumeResult = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoin('listing.nft', 'nft')
      .select([
        'COALESCE(SUM(CAST(listing.price AS NUMERIC)), 0) AS "totalVolume"',
      ])
      .where('nft.collectionId = :id', { id })
      .andWhere('listing.status = :soldStatus', { soldStatus: 'SOLD' })
      .getRawOne();

    return {
      ...collection,
      isVerified: collection.isVerified,
      isHidden: collection.isHidden,
      totalSupply: Number(stats?.totalSupply || 0),
      ownerCount: Number(stats?.ownerCount || 0),
      floorPrice: stats?.floorPrice ? String(stats.floorPrice) : null,
      totalVolume: String(volumeResult?.totalVolume || '0'),
    };
  }

  async getStats(id: string): Promise<{ totalNfts: number; totalVolume: string }> {
    const collection = await this.collectionRepository
      .createQueryBuilder('collection')
      .leftJoinAndSelect('collection.nfts', 'nfts')
      .leftJoinAndSelect('nfts.listings', 'listings')
      .where('collection.id = :id', { id })
      .getOne();

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    const totalNfts = collection.nfts?.length || 0;

    let totalVolume = '0';
    if (collection.nfts) {
      const soldListings = collection.nfts.flatMap(nft =>
        (nft.listings || []).filter(listing => listing.status === 'SOLD')
      );

      totalVolume = soldListings.reduce((sum, listing) => {
        return (BigInt(sum) + BigInt(listing.price)).toString();
      }, '0');
    }

    return { totalNfts, totalVolume };
  }
}
