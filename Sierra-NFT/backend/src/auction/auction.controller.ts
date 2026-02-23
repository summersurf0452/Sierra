import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuctionService } from './auction.service';

@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  /**
   * GET /auctions?page=1&limit=20
   * Active auction list
   */
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.auctionService.findAll(page, limit);
  }

  /**
   * GET /auctions/:id
   * Auction details (including bid history)
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.auctionService.findById(id);
  }

  /**
   * GET /auctions/nft/:contractAddress/:tokenId
   * Active auction for a specific NFT
   */
  @Get('nft/:contractAddress/:tokenId')
  async findByNFT(
    @Param('contractAddress') contractAddress: string,
    @Param('tokenId') tokenId: string,
  ) {
    return this.auctionService.findByNFT(contractAddress, tokenId);
  }

  /**
   * GET /auctions/bidder/:address
   * Auctions a specific address has bid on
   */
  @Get('bidder/:address')
  async findByBidder(
    @Param('address') address: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.auctionService.findByBidder(address, page, limit);
  }
}
