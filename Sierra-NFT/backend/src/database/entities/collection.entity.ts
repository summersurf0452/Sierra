import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Nft } from './nft.entity';
import { ContractType, CollectionCategory } from './enums';

export { ContractType, CollectionCategory };

@Entity('collections')
@Index(['onChainId', 'contractAddress'], { unique: true })
@Index(['creator'])
@Index(['isHidden'])
@Index(['isVerified'])
@Index(['category'])
@Index(['name'])
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  onChainId: number;

  @Column({ type: 'varchar', length: 42 })
  creator: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  symbol: string;

  @Column({ type: 'int', comment: 'Royalty in basis points (e.g., 250 = 2.5%)' })
  royaltyPercentage: number;

  @Column({
    type: 'enum',
    enum: ContractType,
  })
  contractType: ContractType;

  @Column({ type: 'varchar', length: 42 })
  contractAddress: string;

  @Column({
    type: 'enum',
    enum: CollectionCategory,
    default: CollectionCategory.OTHER,
  })
  category: CollectionCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  coverImageUrl: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'boolean', default: false })
  isHidden: boolean;

  @Column({ type: 'int', default: 0 })
  reportCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Nft, (nft) => nft.collection)
  nfts: Nft[];
}
