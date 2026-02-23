import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nft } from '../database/entities/nft.entity';
import { Collection } from '../database/entities/collection.entity';
import { PAGINATION_DEFAULTS } from '../common/pagination.config';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
  ) {}

  async search(
    query: string,
    type: 'all' | 'collections' | 'nfts' = 'all',
    limit = PAGINATION_DEFAULTS.search,
  ): Promise<{ collections: Collection[]; nfts: Nft[] }> {
    const searchTerm = '%' + query + '%';

    let collections: Collection[] = [];
    let nfts: Nft[] = [];

    if (type === 'all' || type === 'collections') {
      collections = await this.collectionRepository
        .createQueryBuilder('c')
        .where('c.name ILIKE :q', { q: searchTerm })
        .andWhere('c.isHidden = :hidden', { hidden: false })
        .orderBy('c.isVerified', 'DESC')
        .addOrderBy('c.createdAt', 'DESC')
        .take(limit)
        .getMany();
    }

    if (type === 'all' || type === 'nfts') {
      nfts = await this.nftRepository
        .createQueryBuilder('nft')
        .leftJoinAndSelect('nft.collection', 'collection')
        .where('(nft.name ILIKE :q OR collection.name ILIKE :q)', {
          q: searchTerm,
        })
        .andWhere('nft.isHidden = :nftHidden', { nftHidden: false })
        .andWhere('collection.isHidden = :colHidden', { colHidden: false })
        .orderBy('nft.createdAt', 'DESC')
        .take(limit)
        .getMany();
    }

    return { collections, nfts };
  }
}
