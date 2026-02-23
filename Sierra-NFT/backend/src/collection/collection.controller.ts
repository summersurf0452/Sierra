import { Controller, Get, Post, Body, Param, Patch, Query, ParseIntPipe, DefaultValuePipe, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CollectionService } from './collection.service';
import { CreateCollectionDto } from './dto/create-collection.dto';

@Controller('collections')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.collectionService.findAll(page, limit);
  }

  @Get('trending')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  async getTrending(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.collectionService.getTrending(Math.min(limit, 20));
  }

  @Get('creator/:address')
  async findByCreator(
    @Param('address') address: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.collectionService.findByCreator(address, page, limit);
  }

  @Post()
  async create(@Body() createCollectionDto: CreateCollectionDto) {
    return this.collectionService.create(createCollectionDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateCollectionDto>,
  ) {
    return this.collectionService.update(id, updateData);
  }

  @Get(':id/detail')
  async getCollectionDetail(@Param('id') id: string) {
    return this.collectionService.getCollectionDetail(id);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.collectionService.getStats(id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.collectionService.findById(id);
  }
}
