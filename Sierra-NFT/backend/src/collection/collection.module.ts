import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { Collection } from '../database/entities/collection.entity';
import { Nft } from '../database/entities/nft.entity';
import { Listing } from '../database/entities/listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Collection, Nft, Listing])],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}
