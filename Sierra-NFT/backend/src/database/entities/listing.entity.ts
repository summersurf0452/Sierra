import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Nft } from './nft.entity';

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  CANCELED = 'CANCELED',
}

@Entity('listings')
@Index(['contractAddress', 'tokenId', 'status'])
@Index(['seller'])
@Index(['buyer'])
@Index(['status'])
@Index(['nftId'])
@Index(['createdAt'])
@Index(['soldAt'])
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 42 })
  seller: string;

  @Column({ type: 'uuid', nullable: true })
  nftId: string;

  @Column({ type: 'varchar', length: 42 })
  contractAddress: string;

  @Column({ type: 'varchar', length: 255 })
  tokenId: string;

  @Column({ type: 'varchar', length: 78, comment: 'Price in wei (stored as string for precision)' })
  price: string;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  @Column({ type: 'varchar', length: 42, nullable: true })
  buyer: string;

  @Column({ type: 'bigint' })
  blockNumber: string;

  @Column({ type: 'varchar', length: 66 })
  transactionHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  soldAt: Date;

  @Column({ type: 'int', nullable: true, default: null, comment: 'ERC-1155 listing quantity. null for ERC-721.' })
  amount: number;

  @Column({ type: 'varchar', length: 78, nullable: true, default: null, comment: 'ERC-1155 price per unit in wei. null for ERC-721 (uses price).' })
  pricePerUnit: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: null, comment: 'ERC721 or ERC1155' })
  contractType: string;

  @Column({ type: 'int', nullable: true, default: null, comment: 'On-chain listing ID from Marketplace1155 contract' })
  onChainListingId: number;

  @ManyToOne(() => Nft, (nft) => nft.listings)
  @JoinColumn({ name: 'nftId' })
  nft: Nft;
}
