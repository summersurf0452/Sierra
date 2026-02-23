import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { Listing } from '../database/entities/listing.entity';
import { Nft } from '../database/entities/nft.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Listing, Nft])],
  controllers: [ListingController],
  providers: [ListingService],
  exports: [ListingService],
})
export class ListingModule {}
