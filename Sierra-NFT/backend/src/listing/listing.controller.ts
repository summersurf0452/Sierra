import { Controller, Get, Post, Body, Param, Patch, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ListingService } from './listing.service';
import { CreateListingDto } from './dto/create-listing.dto';

@Controller('listings')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Get()
  async findActive(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('sort') sort?: string,
    @Query('contractType') contractType?: string,
  ) {
    const validSort =
      sort === 'price_asc' || sort === 'price_desc' ? sort : 'newest';
    const validContractType =
      contractType === 'ERC721' || contractType === 'ERC1155' ? contractType : undefined;
    return this.listingService.findActive(
      page,
      limit,
      validSort as 'newest' | 'price_asc' | 'price_desc',
      validContractType,
    );
  }

  @Get('nft/:contractAddress/:tokenId')
  async findByNft(
    @Param('contractAddress') contractAddress: string,
    @Param('tokenId') tokenId: string,
  ) {
    return this.listingService.findByNft(contractAddress, tokenId);
  }

  @Get('seller/:address')
  async findBySeller(
    @Param('address') address: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.listingService.findBySeller(address, page, limit);
  }

  @Get('activity/:address')
  async getActivity(
    @Param('address') address: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.listingService.getActivity(address, page, limit);
  }

  @Post()
  async register(@Body() createListingDto: CreateListingDto) {
    return this.listingService.register(createListingDto);
  }

  @Patch(':id/sold')
  async markSold(
    @Param('id') id: string,
    @Body('buyer') buyer: string,
  ) {
    return this.listingService.markSold(id, buyer);
  }

  @Patch(':id/canceled')
  async markCanceled(@Param('id') id: string) {
    return this.listingService.markCanceled(id);
  }
}
