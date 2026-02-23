import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ReportTargetType, ReportCategory, ReportStatus } from './enums';

@Entity('reports')
@Index(['targetType', 'targetId'])
@Index(['status'])
@Unique(['reporter', 'targetType', 'targetId'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ReportTargetType })
  targetType: ReportTargetType;

  @Column({ type: 'uuid' })
  targetId: string;

  @Column({ type: 'varchar', length: 42 })
  reporter: string;

  @Column({ type: 'enum', enum: ReportCategory })
  category: ReportCategory;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: 'text', nullable: true })
  adminNote: string;

  @CreateDateColumn()
  createdAt: Date;
}
