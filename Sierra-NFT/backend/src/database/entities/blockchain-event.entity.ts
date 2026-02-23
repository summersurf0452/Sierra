import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum EventName {
  COLLECTION_CREATED = 'CollectionCreated',
  NFT_MINTED = 'NFTMinted',
  LISTING_CREATED = 'ListingCreated',
  LISTING_SOLD = 'ListingSold',
  LISTING_CANCELED = 'ListingCanceled',
  // Auction events
  AUCTION_CREATED = 'AuctionCreated',
  BID_PLACED = 'BidPlaced',
  AUCTION_SETTLED = 'AuctionSettled',
  AUCTION_CANCELED = 'AuctionCanceled',
  // Offer events
  OFFER_CREATED = 'OfferCreated',
  OFFER_ACCEPTED = 'OfferAccepted',
  OFFER_CANCELED = 'OfferCanceled',
  OFFER_WITHDRAWN = 'OfferWithdrawn',
  // Marketplace1155 events
  LISTING_1155_CREATED = 'Listing1155Created',
  LISTING_1155_SOLD = 'Listing1155Sold',
  LISTING_1155_CANCELED = 'Listing1155Canceled',
}

@Entity('blockchain_events')
@Index(['transactionHash', 'logIndex'], { unique: true })
@Index(['eventName'])
@Index(['blockNumber'])
@Index(['processed'])
@Index(['contractAddress'])
export class BlockchainEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EventName,
  })
  eventName: EventName;

  @Column({ type: 'varchar', length: 42 })
  contractAddress: string;

  @Column({ type: 'bigint' })
  blockNumber: string;

  @Column({ type: 'varchar', length: 66 })
  transactionHash: string;

  @Column({ type: 'int' })
  logIndex: number;

  @Column({ type: 'jsonb', comment: 'Event arguments as JSON' })
  args: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
