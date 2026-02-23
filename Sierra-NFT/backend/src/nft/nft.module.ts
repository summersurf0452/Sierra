import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftController } from './nft.controller';
import { NftService } from './nft.service';
import { Nft } from '../database/entities/nft.entity';
import { BlockchainEvent } from '../database/entities/blockchain-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nft, BlockchainEvent])],
  controllers: [NftController],
  providers: [NftService],
  exports: [NftService],
})
export class NftModule {}
