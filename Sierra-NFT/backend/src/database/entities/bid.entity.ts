import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Auction } from './auction.entity';

@Entity('bids')
@Index(['auctionId', 'bidder'])
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  auctionId: string;

  @Column({ type: 'varchar', length: 42 })
  bidder: string;

  @Column({ type: 'varchar', length: 78, comment: 'Bid amount in wei' })
  amount: string;

  @Column({ type: 'varchar', length: 66 })
  transactionHash: string;

  @Column({ type: 'bigint' })
  blockNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Auction, (auction) => auction.bids)
  @JoinColumn({ name: 'auctionId' })
  auction: Auction;
}
