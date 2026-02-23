import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Nft } from '../database/entities/nft.entity';
import { Listing, ListingStatus } from '../database/entities/listing.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Nft)
    private nftRepository: Repository<Nft>,
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
  ) {}

  async findByAddress(address: string): Promise<User | null> {
    const normalizedAddress = address.toLowerCase();
    return this.userRepository.findOne({
      where: { address: normalizedAddress },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.nickname !== undefined) {
      user.nickname = dto.nickname;
    }

    if (dto.bio !== undefined) {
      user.bio = dto.bio;
    }

    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }

    return this.userRepository.save(user);
  }

  async getUserStats(address: string): Promise<{
    ownedCount: number;
    createdCount: number;
    listedCount: number;
  }> {
    const normalizedAddress = address.toLowerCase();

    // Number of owned NFTs
    const ownedCount = await this.nftRepository.count({
      where: { owner: normalizedAddress },
    });

    // Number of minted NFTs (compared with collection.creator)
    const createdCount = await this.nftRepository
      .createQueryBuilder('nft')
      .innerJoin('nft.collection', 'collection')
      .where('collection.creator = :creator', { creator: normalizedAddress })
      .getCount();

    // Number of currently listed NFTs
    const listedCount = await this.listingRepository.count({
      where: { seller: normalizedAddress, status: ListingStatus.ACTIVE },
    });

    return { ownedCount, createdCount, listedCount };
  }

  async getUserActivity(address: string): Promise<{
    recentMints: any[];
    recentPurchases: any[];
    recentSales: any[];
  }> {
    const normalizedAddress = address.toLowerCase();

    // Recently minted NFTs (determined by collection.creator)
    const recentMints = await this.nftRepository
      .createQueryBuilder('nft')
      .innerJoinAndSelect('nft.collection', 'collection')
      .where('collection.creator = :creator', { creator: normalizedAddress })
      .orderBy('nft.createdAt', 'DESC')
      .limit(10)
      .getMany();

    // Recent purchase history
    const recentPurchases = await this.listingRepository
      .createQueryBuilder('listing')
      .innerJoinAndSelect('listing.nft', 'nft')
      .where('listing.buyer = :buyer', { buyer: normalizedAddress })
      .andWhere('listing.status = :status', { status: ListingStatus.SOLD })
      .orderBy('listing.soldAt', 'DESC')
      .limit(10)
      .getMany();

    // Recent sales history
    const recentSales = await this.listingRepository
      .createQueryBuilder('listing')
      .innerJoinAndSelect('listing.nft', 'nft')
      .where('listing.seller = :seller', { seller: normalizedAddress })
      .andWhere('listing.status = :status', { status: ListingStatus.SOLD })
      .orderBy('listing.soldAt', 'DESC')
      .limit(10)
      .getMany();

    return {
      recentMints: recentMints.map((nft) => ({
        id: nft.id,
        tokenId: nft.tokenId,
        tokenURI: nft.tokenURI,
        createdAt: nft.createdAt,
        collection: {
          name: nft.collection.name,
          symbol: nft.collection.symbol,
        },
      })),
      recentPurchases: recentPurchases.map((listing) => ({
        id: listing.id,
        price: listing.price,
        soldAt: listing.soldAt,
        nft: {
          tokenId: listing.nft.tokenId,
          tokenURI: listing.nft.tokenURI,
        },
      })),
      recentSales: recentSales.map((listing) => ({
        id: listing.id,
        price: listing.price,
        soldAt: listing.soldAt,
        buyer: listing.buyer,
        nft: {
          tokenId: listing.nft.tokenId,
          tokenURI: listing.nft.tokenURI,
        },
      })),
    };
  }
}
