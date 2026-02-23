import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Collection } from './collection.entity';
import { ContractType } from './enums';
import { Listing } from './listing.entity';

@Entity('nfts')
@Index(['tokenId', 'contractAddress'], { unique: true })
@Index(['owner'])
@Index(['collectionId'])
@Index(['isHidden'])
@Index(['createdAt'])
export class Nft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, comment: 'On-chain token ID (supports BigInt as string)' })
  tokenId: string;

  @Column({ type: 'uuid' })
  collectionId: string;

  @Column({ type: 'varchar', length: 42 })
  owner: string;

  @Column({ type: 'text' })
  tokenURI: string;

  @Column({ type: 'varchar', length: 42 })
  contractAddress: string;

  @Column({
    type: 'enum',
    enum: ContractType,
  })
  contractType: ContractType;

  @Column({ type: 'int', default: 1, comment: 'Supply for ERC-1155, always 1 for ERC-721' })
  supply: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Cached metadata: NFT name' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: 'Cached metadata: NFT description' })
  description: string;

  @Column({ type: 'text', nullable: true, comment: 'Cached metadata: NFT image URL' })
  imageUrl: string;

  @Column({ type: 'boolean', default: false })
  isHidden: boolean;

  @Column({ type: 'int', default: 0 })
  reportCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Collection, (collection) => collection.nfts)
  @JoinColumn({ name: 'collectionId' })
  collection: Collection;

  @OneToMany(() => Listing, (listing) => listing.nft)
  listings: Listing[];
}
