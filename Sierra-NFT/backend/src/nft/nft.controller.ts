import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { NftService, RegisterMintDto } from './nft.service';

@Controller('nfts')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Get()
  async findAll(
    @Query('owner') owner?: string,
    @Query('collectionId') collectionId?: string,
    @Query('contractAddress') contractAddress?: string,
    @Query('contractType') contractType?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    const validContractType =
      contractType === 'ERC721' || contractType === 'ERC1155' ? contractType : undefined;

    // If any discovery filter params are provided, use findFiltered
    if (minPrice || maxPrice || status || category || search || sortBy) {
      const validSortBy =
        sortBy === 'price_asc' || sortBy === 'price_desc' || sortBy === 'popularity'
          ? sortBy
          : 'newest';

      const validStatus =
        status === 'listed' || status === 'unlisted' ? status : 'all';

      return this.nftService.findFiltered(
        {
          collectionId,
          minPrice,
          maxPrice,
          status: validStatus as 'listed' | 'unlisted' | 'all',
          category,
          search,
          sortBy: validSortBy as 'price_asc' | 'price_desc' | 'newest' | 'popularity',
        },
        page,
        limit,
      );
    }

    return this.nftService.findAll(
      { owner, collectionId, contractAddress, contractType: validContractType },
      page,
      limit,
    );
  }

  @Get('creator/:address')
  async findByCreator(
    @Param('address') address: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.nftService.findByCreator(address, page, limit);
  }

  @Get('owner/:address')
  async findByOwner(
    @Param('address') address: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.nftService.findByOwner(address, page, limit);
  }

  @Post('register')
  async register(@Body() registerMintDto: RegisterMintDto) {
    return this.nftService.registerMint(registerMintDto);
  }

  @Get(':id/activity')
  async getActivity(
    @Param('id') id: string,
    @Query('eventType') eventType?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.nftService.getActivity(
      id,
      eventType ? { eventType } : undefined,
      page,
      limit,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.nftService.findById(id);
  }
}
