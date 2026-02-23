import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Report } from '../database/entities/report.entity';
import { Collection } from '../database/entities/collection.entity';
import { Nft } from '../database/entities/nft.entity';
import { ReportTargetType } from '../database/entities/enums';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportService {
  private readonly autoHideThreshold: number;

  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(Nft)
    private nftRepository: Repository<Nft>,
    private configService: ConfigService,
  ) {
    this.autoHideThreshold = this.configService.get<number>(
      'REPORT_AUTO_HIDE_THRESHOLD',
      5,
    );
  }

  async createReport(dto: CreateReportDto, reporter: string) {
    const normalizedReporter = reporter.toLowerCase();

    // Check for duplicate report from same reporter on same target
    const existing = await this.reportRepository.findOne({
      where: {
        reporter: normalizedReporter,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });

    if (existing) {
      // Silently return same response to prevent information leakage
      return { message: 'Report has been submitted' };
    }

    // Create and save the report
    const report = this.reportRepository.create({
      ...dto,
      reporter: normalizedReporter,
    });
    await this.reportRepository.save(report);

    // Increment reportCount on target and check auto-hide threshold
    if (dto.targetType === ReportTargetType.COLLECTION) {
      await this.collectionRepository.increment(
        { id: dto.targetId },
        'reportCount',
        1,
      );
      const collection = await this.collectionRepository.findOne({
        where: { id: dto.targetId },
      });
      if (collection && collection.reportCount >= this.autoHideThreshold) {
        collection.isHidden = true;
        await this.collectionRepository.save(collection);
      }
    } else if (dto.targetType === ReportTargetType.NFT) {
      await this.nftRepository.increment(
        { id: dto.targetId },
        'reportCount',
        1,
      );
      const nft = await this.nftRepository.findOne({
        where: { id: dto.targetId },
      });
      if (nft && nft.reportCount >= this.autoHideThreshold) {
        nft.isHidden = true;
        await this.nftRepository.save(nft);
      }
    }

    return { message: 'Report has been submitted' };
  }
}
