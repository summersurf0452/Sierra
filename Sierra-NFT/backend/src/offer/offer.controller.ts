import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { OfferService } from './offer.service';

@Controller('offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  /**
   * GET /offers/nft/:contractAddress/:tokenId
   * List of offers for an NFT (sorted by highest price)
   */
  @Get('nft/:contractAddress/:tokenId')
  async findByNFT(
    @Param('contractAddress') contractAddress: string,
    @Param('tokenId') tokenId: string,
  ) {
    return this.offerService.findByNFT(contractAddress, tokenId);
  }

  /**
   * GET /offers/offerer/:address
   * List of offers sent by a user
   */
  @Get('offerer/:address')
  async findByOfferer(
    @Param('address') address: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.offerService.findByOfferer(address, page, limit);
  }

  /**
   * GET /offers/:id
   * Offer details
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.offerService.findById(id);
  }
}
