import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Nft } from '../database/entities/nft.entity';
import { Collection } from '../database/entities/collection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Nft, Collection])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
