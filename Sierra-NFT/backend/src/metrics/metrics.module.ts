import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Listing } from '../database/entities/listing.entity';
import { Nft } from '../database/entities/nft.entity';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { AdminJwtAuthGuard } from '../admin/admin-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, Nft]),
    JwtModule.register({}),
  ],
  controllers: [MetricsController],
  providers: [MetricsService, AdminJwtAuthGuard],
  exports: [MetricsService],
})
export class MetricsModule {}
