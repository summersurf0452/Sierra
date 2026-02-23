import { registerAs } from '@nestjs/config';

export interface BlockchainConfig {
  nft721Address: string;
  nft1155Address: string;
  marketplaceAddress: string;
  auctionAddress: string;
  offersAddress: string;
  marketplace1155Address: string;
  worldlandRpcUrl: string;
  chainId: number;
}

export default registerAs(
  'blockchain',
  (): BlockchainConfig => ({
    nft721Address: process.env.NFT721_ADDRESS || '',
    nft1155Address: process.env.NFT1155_ADDRESS || '',
    marketplaceAddress: process.env.MARKETPLACE_ADDRESS || '',
    auctionAddress: process.env.AUCTION_ADDRESS || '',
    offersAddress: process.env.OFFERS_ADDRESS || '',
    marketplace1155Address: process.env.MARKETPLACE1155_ADDRESS || '',
    worldlandRpcUrl:
      process.env.WORLDLAND_RPC_URL || 'https://seoul.worldland.foundation/',
    chainId: parseInt(process.env.CHAIN_ID, 10) || 103,
  }),
);
