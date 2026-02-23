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
import { OfferStatus } from './enums';

@Entity('offers')
@Index(['contractAddress', 'tokenId', 'status'])
@Index(['offerer', 'status'])
@Index(['onChainId'])
@Index(['expiresAt'])
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', comment: 'On-chain offer ID' })
  onChainId: number;

  @Column({ type: 'varchar', length: 42 })
  offerer: string;

  @Column({ type: 'uuid', nullable: true })
  nftId: string;

  @Column({ type: 'varchar', length: 42 })
  contractAddress: string;

  @Column({ type: 'varchar', length: 255 })
  tokenId: string;

  @Column({ type: 'varchar', length: 78, comment: 'Offer price in wei' })
  price: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.ACTIVE,
  })
  status: OfferStatus;

  @Column({ type: 'varchar', length: 66, nullable: true })
  transactionHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Nft)
  @JoinColumn({ name: 'nftId' })
  nft: Nft;
}
