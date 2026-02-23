import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Nft } from './nft.entity';
import { AuctionStatus } from './enums';

@Entity('auctions')
@Index(['contractAddress', 'tokenId', 'status'])
@Index(['status', 'endTime'])
@Index(['onChainId'])
@Index(['seller'])
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', comment: 'On-chain auction ID' })
  onChainId: number;

  @Column({ type: 'varchar', length: 42 })
  seller: string;

  @Column({ type: 'uuid', nullable: true })
  nftId: string;

  @Column({ type: 'varchar', length: 42 })
  contractAddress: string;

  @Column({ type: 'varchar', length: 255 })
  tokenId: string;

  @Column({ type: 'varchar', length: 78, comment: 'Start price in wei' })
  startPrice: string;

  @Column({ type: 'varchar', length: 78, comment: 'Minimum bid increment in wei' })
  minBidIncrement: string;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ type: 'varchar', length: 42, nullable: true })
  highestBidder: string;

  @Column({ type: 'varchar', length: 78, default: '0' })
  highestBid: string;

  @Column({ type: 'int', default: 0 })
  bidCount: number;

  @Column({
    type: 'enum',
    enum: AuctionStatus,
    default: AuctionStatus.ACTIVE,
  })
  status: AuctionStatus;

  @Column({ type: 'varchar', length: 66, nullable: true })
  transactionHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Nft)
  @JoinColumn({ name: 'nftId' })
  nft: Nft;

  @OneToMany('Bid', 'auction')
  bids: any[];
}
