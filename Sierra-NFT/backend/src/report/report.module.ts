import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../database/entities/report.entity';
import { Collection } from '../database/entities/collection.entity';
import { Nft } from '../database/entities/nft.entity';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Collection, Nft])],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
