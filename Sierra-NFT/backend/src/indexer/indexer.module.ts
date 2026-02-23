import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection, Nft, Listing, BlockchainEvent, Auction, Bid, Offer } from '../database/entities';
import { IndexerService } from './indexer.service';
import { NftHandler } from './handlers/nft.handler';
import { MarketplaceHandler } from './handlers/marketplace.handler';
import { AuctionHandler } from './handlers/auction.handler';
import { OfferHandler } from './handlers/offer.handler';
import { Marketplace1155Handler } from './handlers/marketplace1155.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collection, Nft, Listing, BlockchainEvent, Auction, Bid, Offer]),
  ],
  providers: [
    IndexerService,
    NftHandler,
    MarketplaceHandler,
    AuctionHandler,
    OfferHandler,
    Marketplace1155Handler,
  ],
  exports: [IndexerService],
})
export class IndexerModule {}
