import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection, Nft, BlockchainEvent } from '../../database/entities';
import { ContractType } from '../../database/entities/collection.entity';
import { EventName } from '../../database/entities/blockchain-event.entity';

@Injectable()
export class NftHandler {
  private readonly logger = new Logger(NftHandler.name);

  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
    @InjectRepository(BlockchainEvent)
    private readonly blockchainEventRepository: Repository<BlockchainEvent>,
  ) {}

  /**
   * Handle CollectionCreated event
   */
  async handleCollectionCreated(log: any, contractType: 'ERC721' | 'ERC1155') {
    const { collectionId, creator, name } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `CollectionCreated: collectionId=${collectionId}, creator=${creator}, type=${contractType}`,
    );

    try {
      // Duplicate check
      const existingEvent = await this.blockchainEventRepository.findOne({
        where: {
          transactionHash,
          logIndex: Number(logIndex),
        },
      });

      if (existingEvent) {
        this.logger.debug(`Duplicate event detected: ${transactionHash}#${logIndex}`);
        return;
      }

      // Upsert: may have been registered from frontend first
      const existing = await this.collectionRepository.findOne({
        where: {
          onChainId: Number(collectionId),
          contractAddress: log.address.toLowerCase(),
        },
      });

      let collection;
      if (existing) {
        collection = existing;
        this.logger.debug(`Collection already exists: onChainId=${collectionId}`);
      } else {
        collection = this.collectionRepository.create({
          onChainId: Number(collectionId),
          contractType: contractType === 'ERC721' ? ContractType.ERC721 : ContractType.ERC1155,
          contractAddress: log.address.toLowerCase(),
          name,
          symbol: '',
          royaltyPercentage: 0,
          creator: creator.toLowerCase(),
        });
        await this.collectionRepository.save(collection);
      }

      // Save BlockchainEvent
      const event = this.blockchainEventRepository.create({
        eventName: EventName.COLLECTION_CREATED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: { collectionId: collectionId.toString(), creator, name },
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(
        `Collection saved: ID=${collection.id}, onChainId=${collectionId}`,
      );
    } catch (error) {
      this.logger.error(
        `CollectionCreated handling failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle NFTMinted event
   */
  async handleNFTMinted(log: any, contractType: 'ERC721' | 'ERC1155') {
    const { tokenId, collectionId, owner } = log.args;
    const { transactionHash, logIndex, blockNumber } = log;

    this.logger.log(
      `NFTMinted: tokenId=${tokenId}, collectionId=${collectionId}, owner=${owner}`,
    );

    try {
      // Duplicate check
      const existingEvent = await this.blockchainEventRepository.findOne({
        where: {
          transactionHash,
          logIndex: Number(logIndex),
        },
      });

      if (existingEvent) {
        this.logger.debug(`Duplicate event detected: ${transactionHash}#${logIndex}`);
        return;
      }

      // Look up Collection
      const collection = await this.collectionRepository.findOne({
        where: {
          onChainId: Number(collectionId),
          contractAddress: log.address.toLowerCase(),
        },
      });

      if (!collection) {
        this.logger.error(
          `Collection not found: onChainId=${collectionId}, contract=${log.address}`,
        );
        return;
      }

      // Create NFT
      const tokenURI = log.args.tokenURI;
      const supply = contractType === 'ERC1155' ? Number(log.args.amount) : 1;

      // Parse metadata from tokenURI (supports both http and ipfs:// URIs)
      let metadata = { name: null, description: null, imageUrl: null };
      try {
        let metadataUrl = tokenURI;
        if (tokenURI && tokenURI.startsWith('ipfs://')) {
          const cid = tokenURI.replace('ipfs://', '');
          metadataUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
        }

        if (metadataUrl && (metadataUrl.startsWith('http://') || metadataUrl.startsWith('https://'))) {
          const response = await fetch(metadataUrl);
          const json = await response.json();

          // Resolve image URL (also convert ipfs:// to http)
          let imageUrl = json.image || null;
          if (imageUrl && imageUrl.startsWith('ipfs://')) {
            const imgCid = imageUrl.replace('ipfs://', '');
            imageUrl = `https://gateway.pinata.cloud/ipfs/${imgCid}`;
          }

          metadata = {
            name: json.name || null,
            description: json.description || null,
            imageUrl,
          };
          this.logger.log(`Metadata parsed for tokenId=${tokenId}: ${metadata.name}`);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse metadata for tokenId=${tokenId}: ${error.message}`,
        );
      }

      // Upsert: may have been registered from frontend POST /nfts/register first
      const existingNft = await this.nftRepository.findOne({
        where: {
          tokenId: tokenId.toString(),
          contractAddress: log.address.toLowerCase(),
        },
      });

      let nft;
      if (existingNft) {
        // Update existing NFT (fill in empty metadata)
        if (!existingNft.name && metadata.name) existingNft.name = metadata.name;
        if (!existingNft.description && metadata.description) existingNft.description = metadata.description;
        if (!existingNft.imageUrl && metadata.imageUrl) existingNft.imageUrl = metadata.imageUrl;
        existingNft.owner = owner.toLowerCase();
        nft = await this.nftRepository.save(existingNft);
        this.logger.debug(`NFT already exists, updating: tokenId=${tokenId}`);
      } else {
        nft = this.nftRepository.create({
          tokenId: tokenId.toString(),
          contractAddress: log.address.toLowerCase(),
          contractType: contractType === 'ERC721' ? ContractType.ERC721 : ContractType.ERC1155,
          collectionId: collection.id,
          owner: owner.toLowerCase(),
          tokenURI,
          supply,
          name: metadata.name,
          description: metadata.description,
          imageUrl: metadata.imageUrl,
        });
        await this.nftRepository.save(nft);
      }

      // Save BlockchainEvent
      const eventArgs: any = {
        tokenId: tokenId.toString(),
        collectionId: collectionId.toString(),
        owner,
        tokenURI,
      };
      if (contractType === 'ERC1155') {
        eventArgs.amount = supply.toString();
      }

      const event = this.blockchainEventRepository.create({
        eventName: EventName.NFT_MINTED,
        contractAddress: log.address.toLowerCase(),
        transactionHash,
        blockNumber: blockNumber.toString(),
        logIndex: Number(logIndex),
        args: eventArgs,
        processed: true,
      });

      await this.blockchainEventRepository.save(event);

      this.logger.log(`NFT saved: ID=${nft.id}, tokenId=${tokenId}`);
    } catch (error) {
      this.logger.error(`NFTMinted handling failed: ${error.message}`, error.stack);
    }
  }
}
