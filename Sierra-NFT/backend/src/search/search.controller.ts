import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(15000)
  async search(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    if (!query || query.trim().length < 1) {
      return { collections: [], nfts: [] };
    }

    const validType =
      type === 'collections' || type === 'nfts' ? type : 'all';

    return this.searchService.search(
      query.trim(),
      validType,
      Math.min(limit, 50),
    );
  }
}
