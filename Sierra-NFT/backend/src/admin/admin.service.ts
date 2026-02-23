import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Collection } from '../database/entities/collection.entity';
import { Nft } from '../database/entities/nft.entity';
import { Report } from '../database/entities/report.entity';
import { ReportStatus } from '../database/entities/enums';
import { ReviewReportDto } from './dto/review-report.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(Nft)
    private nftRepository: Repository<Nft>,
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
  ) {}

  async verifyCollection(id: string) {
    const collection = await this.collectionRepository.findOne({
      where: { id },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }
    collection.isVerified = true;
    collection.verifiedAt = new Date();
    await this.collectionRepository.save(collection);
    return { success: true, message: 'Collection verified' };
  }

  async unverifyCollection(id: string) {
    const collection = await this.collectionRepository.findOne({
      where: { id },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }
    collection.isVerified = false;
    collection.verifiedAt = null;
    await this.collectionRepository.save(collection);
    return { success: true, message: 'Collection unverified' };
  }

  async getCollections(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [collections, total] = await this.collectionRepository.findAndCount({
      order: { isVerified: 'DESC', createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return {
      data: collections,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReports(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status && Object.values(ReportStatus).includes(status as ReportStatus)) {
      where.status = status;
    }
    const [reports, total] = await this.reportRepository.findAndCount({
      where,
      order: {
        status: 'ASC', // PENDING first (alphabetical: DISMISSED > PENDING > REVIEWED -- we want PENDING first)
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });
    return {
      data: reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reviewReport(id: string, dto: ReviewReportDto) {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    report.status = dto.status;
    if (dto.adminNote !== undefined) {
      report.adminNote = dto.adminNote;
    }
    await this.reportRepository.save(report);
    return { success: true, message: 'Report reviewed' };
  }

  async hideCollection(id: string) {
    const collection = await this.collectionRepository.findOne({
      where: { id },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }
    collection.isHidden = true;
    await this.collectionRepository.save(collection);
    return { success: true, message: 'Collection hidden' };
  }

  async unhideCollection(id: string) {
    const collection = await this.collectionRepository.findOne({
      where: { id },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }
    collection.isHidden = false;
    collection.reportCount = 0;
    await this.collectionRepository.save(collection);
    return { success: true, message: 'Collection unhidden' };
  }

  async hideNft(id: string) {
    const nft = await this.nftRepository.findOne({ where: { id } });
    if (!nft) {
      throw new NotFoundException('NFT not found');
    }
    nft.isHidden = true;
    await this.nftRepository.save(nft);
    return { success: true, message: 'NFT hidden' };
  }

  async unhideNft(id: string) {
    const nft = await this.nftRepository.findOne({ where: { id } });
    if (!nft) {
      throw new NotFoundException('NFT not found');
    }
    nft.isHidden = false;
    nft.reportCount = 0;
    await this.nftRepository.save(nft);
    return { success: true, message: 'NFT unhidden' };
  }

  async getDashboardStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalCollections,
      verifiedCollections,
      hiddenCollections,
      totalNfts,
      hiddenNfts,
      totalReports,
      pendingReports,
      recentCollections,
      recentReports,
    ] = await Promise.all([
      this.collectionRepository.count(),
      this.collectionRepository.count({ where: { isVerified: true } }),
      this.collectionRepository.count({ where: { isHidden: true } }),
      this.nftRepository.count(),
      this.nftRepository.count({ where: { isHidden: true } }),
      this.reportRepository.count(),
      this.reportRepository.count({ where: { status: ReportStatus.PENDING } }),
      this.collectionRepository.count({
        where: { createdAt: MoreThan(oneDayAgo) },
      }),
      this.reportRepository.count({
        where: { createdAt: MoreThan(oneDayAgo) },
      }),
    ]);

    return {
      collections: {
        total: totalCollections,
        verified: verifiedCollections,
        hidden: hiddenCollections,
      },
      nfts: {
        total: totalNfts,
        hidden: hiddenNfts,
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
      },
      recent24h: {
        newCollections: recentCollections,
        newReports: recentReports,
      },
    };
  }
}
