import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ReportTargetType, ReportCategory } from '../../database/entities/enums';

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @IsUUID()
  targetId: string;

  @IsEnum(ReportCategory)
  category: ReportCategory;

  @IsString()
  @IsOptional()
  description?: string;
}
