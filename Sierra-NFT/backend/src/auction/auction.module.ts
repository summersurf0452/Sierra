import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auction } from '../database/entities/auction.entity';
import { Bid } from '../database/entities/bid.entity';
import { Nft } from '../database/entities/nft.entity';
import { AuctionService } from './auction.service';
import { AuctionController } from './auction.controller';
import { AuctionSettlementService } from './auction-settlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([Auction, Bid, Nft])],
  providers: [AuctionService, AuctionSettlementService],
  controllers: [AuctionController],
  exports: [AuctionService],
})
export class AuctionModule {}
