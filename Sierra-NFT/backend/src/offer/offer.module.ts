import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Offer } from '../database/entities/offer.entity';
import { Nft } from '../database/entities/nft.entity';
import { OfferService } from './offer.service';
import { OfferController } from './offer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Offer, Nft])],
  providers: [OfferService],
  controllers: [OfferController],
  exports: [OfferService],
})
export class OfferModule {}
