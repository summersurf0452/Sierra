import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, http, PublicClient } from 'viem';
import { worldlandMainnet } from '../common/chains';
import { SharedNFT721Abi } from '../common/abis/SharedNFT721.abi';
import { SharedNFT1155Abi } from '../common/abis/SharedNFT1155.abi';
import { MarketplaceAbi } from '../common/abis/Marketplace.abi';
import { AuctionAbi } from '../common/abis/Auction.abi';
import { OffersAbi } from '../common/abis/Offers.abi';
import { Marketplace1155Abi } from '../common/abis/Marketplace1155.abi';
import { NftHandler } from './handlers/nft.handler';
import { MarketplaceHandler } from './handlers/marketplace.handler';
import { AuctionHandler } from './handlers/auction.handler';
import { OfferHandler } from './handlers/offer.handler';
import { Marketplace1155Handler } from './handlers/marketplace1155.handler';

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private publicClient: PublicClient;
  private unwatchFunctions: Array<() => void> = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly nftHandler: NftHandler,
    private readonly marketplaceHandler: MarketplaceHandler,
    private readonly auctionHandler: AuctionHandler,
    private readonly offerHandler: OfferHandler,
    private readonly marketplace1155Handler: Marketplace1155Handler,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting blockchain event indexer');

    const rpcUrl = this.configService.get<string>('blockchain.worldlandRpcUrl');
    const nft721Address = this.configService.get<string>('blockchain.nft721Address');
    const nft1155Address = this.configService.get<string>('blockchain.nft1155Address');
    const marketplaceAddress = this.configService.get<string>('blockchain.marketplaceAddress');
    const auctionAddress = this.configService.get<string>('blockchain.auctionAddress');
    const offersAddress = this.configService.get<string>('blockchain.offersAddress');
    const marketplace1155Address = this.configService.get<string>('blockchain.marketplace1155Address');

    // Create Viem Public Client
    this.publicClient = createPublicClient({
      chain: worldlandMainnet,
      transport: http(rpcUrl),
    }) as PublicClient;

    this.logger.log(`RPC URL: ${rpcUrl}`);

    // Check core contract addresses (NFT + Marketplace)
    if (!nft721Address || !nft1155Address || !marketplaceAddress) {
      this.logger.warn(
        'Core contract addresses are not configured. Set NFT721_ADDRESS, NFT1155_ADDRESS, MARKETPLACE_ADDRESS in .env.',
      );
      this.logger.warn('Core indexer will not detect events.');
    } else {
      // Start core event listeners
      await this.watchNFT721Events(nft721Address as `0x${string}`);
      await this.watchNFT1155Events(nft1155Address as `0x${string}`);
      await this.watchMarketplaceEvents(marketplaceAddress as `0x${string}`);
    }

    // Auction contract listening
    if (auctionAddress) {
      await this.watchAuctionEvents(auctionAddress as `0x${string}`);
    } else {
      this.logger.warn('AUCTION_ADDRESS is not configured. Auction events will not be detected.');
    }

    // Offers contract listening
    if (offersAddress) {
      await this.watchOffersEvents(offersAddress as `0x${string}`);
    } else {
      this.logger.warn('OFFERS_ADDRESS is not configured. Offer events will not be detected.');
    }

    // Marketplace1155 contract listening
    if (marketplace1155Address) {
      await this.watchMarketplace1155Events(marketplace1155Address as `0x${string}`);
    } else {
      this.logger.warn('MARKETPLACE1155_ADDRESS is not configured. ERC-1155 marketplace events will not be detected.');
    }

    this.logger.log('All event listeners started successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down indexer...');
    this.unwatchFunctions.forEach((unwatch) => unwatch());
    this.logger.log('All event listeners cleaned up');
  }

  /**
   * Watch SharedNFT721 events
   */
  private async watchNFT721Events(contractAddress: `0x${string}`) {
    this.logger.log(`Starting SharedNFT721 event listener: ${contractAddress}`);

    // CollectionCreated event
    const unwatchCollectionCreated = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: SharedNFT721Abi,
      eventName: 'CollectionCreated',
      batch: true,
      pollingInterval: 12_000, // 12 seconds (WorldLand block time)
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.nftHandler.handleCollectionCreated(log, 'ERC721');
          } catch (error) {
            this.logger.error(
              `Error processing CollectionCreated event: ${error.message}`,
            );
          }
        }
      },
    });

    // NFTMinted event
    const unwatchNFTMinted = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: SharedNFT721Abi,
      eventName: 'NFTMinted',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.nftHandler.handleNFTMinted(log, 'ERC721');
          } catch (error) {
            this.logger.error(
              `Error processing NFTMinted(ERC721) event: ${error.message}`,
            );
          }
        }
      },
    });

    this.unwatchFunctions.push(unwatchCollectionCreated, unwatchNFTMinted);
  }

  /**
   * Watch SharedNFT1155 events
   */
  private async watchNFT1155Events(contractAddress: `0x${string}`) {
    this.logger.log(`Starting SharedNFT1155 event listener: ${contractAddress}`);

    // CollectionCreated event
    const unwatchCollectionCreated = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: SharedNFT1155Abi,
      eventName: 'CollectionCreated',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.nftHandler.handleCollectionCreated(log, 'ERC1155');
          } catch (error) {
            this.logger.error(
              `Error processing CollectionCreated(ERC1155) event: ${error.message}`,
            );
          }
        }
      },
    });

    // NFTMinted event
    const unwatchNFTMinted = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: SharedNFT1155Abi,
      eventName: 'NFTMinted',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.nftHandler.handleNFTMinted(log, 'ERC1155');
          } catch (error) {
            this.logger.error(
              `Error processing NFTMinted(ERC1155) event: ${error.message}`,
            );
          }
        }
      },
    });

    this.unwatchFunctions.push(unwatchCollectionCreated, unwatchNFTMinted);
  }

  /**
   * Watch Marketplace events
   */
  private async watchMarketplaceEvents(contractAddress: `0x${string}`) {
    this.logger.log(`Starting Marketplace event listener: ${contractAddress}`);

    // ListingCreated event
    const unwatchListingCreated = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: MarketplaceAbi,
      eventName: 'ListingCreated',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.marketplaceHandler.handleListingCreated(log);
          } catch (error) {
            this.logger.error(
              `Error processing ListingCreated event: ${error.message}`,
            );
          }
        }
      },
    });

    // ListingSold event
    const unwatchListingSold = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: MarketplaceAbi,
      eventName: 'ListingSold',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.marketplaceHandler.handleListingSold(log);
          } catch (error) {
            this.logger.error(
              `Error processing ListingSold event: ${error.message}`,
            );
          }
        }
      },
    });

    // ListingCanceled event
    const unwatchListingCanceled = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: MarketplaceAbi,
      eventName: 'ListingCanceled',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.marketplaceHandler.handleListingCanceled(log);
          } catch (error) {
            this.logger.error(
              `Error processing ListingCanceled event: ${error.message}`,
            );
          }
        }
      },
    });

    this.unwatchFunctions.push(
      unwatchListingCreated,
      unwatchListingSold,
      unwatchListingCanceled,
    );
  }

  /**
   * Watch Auction events
   */
  private async watchAuctionEvents(contractAddress: `0x${string}`) {
    this.logger.log(`Starting Auction event listener: ${contractAddress}`);

    // AuctionCreated event
    const unwatchAuctionCreated = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: AuctionAbi,
      eventName: 'AuctionCreated',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.auctionHandler.handleAuctionCreated(log);
          } catch (error) {
            this.logger.error(
              `Error processing AuctionCreated event: ${error.message}`,
            );
          }
        }
      },
    });

    // BidPlaced event
    const unwatchBidPlaced = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: AuctionAbi,
      eventName: 'BidPlaced',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.auctionHandler.handleBidPlaced(log);
          } catch (error) {
            this.logger.error(
              `Error processing BidPlaced event: ${error.message}`,
            );
          }
        }
      },
    });

    // AuctionSettled event
    const unwatchAuctionSettled = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: AuctionAbi,
      eventName: 'AuctionSettled',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.auctionHandler.handleAuctionSettled(log);
          } catch (error) {
            this.logger.error(
              `Error processing AuctionSettled event: ${error.message}`,
            );
          }
        }
      },
    });

    // AuctionCanceled event
    const unwatchAuctionCanceled = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: AuctionAbi,
      eventName: 'AuctionCanceled',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.auctionHandler.handleAuctionCanceled(log);
          } catch (error) {
            this.logger.error(
              `Error processing AuctionCanceled event: ${error.message}`,
            );
          }
        }
      },
    });

    this.unwatchFunctions.push(
      unwatchAuctionCreated,
      unwatchBidPlaced,
      unwatchAuctionSettled,
      unwatchAuctionCanceled,
    );
  }

  /**
   * Watch Offers events
   */
  private async watchOffersEvents(contractAddress: `0x${string}`) {
    this.logger.log(`Starting Offers event listener: ${contractAddress}`);

    // OfferCreated event
    const unwatchOfferCreated = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: OffersAbi,
      eventName: 'OfferCreated',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.offerHandler.handleOfferCreated(log);
          } catch (error) {
            this.logger.error(
              `Error processing OfferCreated event: ${error.message}`,
            );
          }
        }
      },
    });

    // OfferAccepted event
    const unwatchOfferAccepted = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: OffersAbi,
      eventName: 'OfferAccepted',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.offerHandler.handleOfferAccepted(log);
          } catch (error) {
            this.logger.error(
              `Error processing OfferAccepted event: ${error.message}`,
            );
          }
        }
      },
    });

    // OfferCanceled event
    const unwatchOfferCanceled = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: OffersAbi,
      eventName: 'OfferCanceled',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.offerHandler.handleOfferCanceled(log);
          } catch (error) {
            this.logger.error(
              `Error processing OfferCanceled event: ${error.message}`,
            );
          }
        }
      },
    });

    // OfferWithdrawn event
    const unwatchOfferWithdrawn = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: OffersAbi,
      eventName: 'OfferWithdrawn',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.offerHandler.handleOfferWithdrawn(log);
          } catch (error) {
            this.logger.error(
              `Error processing OfferWithdrawn event: ${error.message}`,
            );
          }
        }
      },
    });

    this.unwatchFunctions.push(
      unwatchOfferCreated,
      unwatchOfferAccepted,
      unwatchOfferCanceled,
      unwatchOfferWithdrawn,
    );
  }

  /**
   * Watch Marketplace1155 events
   */
  private async watchMarketplace1155Events(contractAddress: `0x${string}`) {
    this.logger.log(`Starting Marketplace1155 event listener: ${contractAddress}`);

    // Listing1155Created event
    const unwatchListing1155Created = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: Marketplace1155Abi,
      eventName: 'Listing1155Created',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.marketplace1155Handler.handleListing1155Created(log);
          } catch (error) {
            this.logger.error(
              `Error processing Listing1155Created event: ${error.message}`,
            );
          }
        }
      },
    });

    // Listing1155Sold event
    const unwatchListing1155Sold = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: Marketplace1155Abi,
      eventName: 'Listing1155Sold',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.marketplace1155Handler.handleListing1155Sold(log);
          } catch (error) {
            this.logger.error(
              `Error processing Listing1155Sold event: ${error.message}`,
            );
          }
        }
      },
    });

    // Listing1155Canceled event
    const unwatchListing1155Canceled = this.publicClient.watchContractEvent({
      address: contractAddress,
      abi: Marketplace1155Abi,
      eventName: 'Listing1155Canceled',
      batch: true,
      pollingInterval: 12_000,
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.marketplace1155Handler.handleListing1155Canceled(log);
          } catch (error) {
            this.logger.error(
              `Error processing Listing1155Canceled event: ${error.message}`,
            );
          }
        }
      },
    });

    this.unwatchFunctions.push(
      unwatchListing1155Created,
      unwatchListing1155Sold,
      unwatchListing1155Canceled,
    );
  }
}
