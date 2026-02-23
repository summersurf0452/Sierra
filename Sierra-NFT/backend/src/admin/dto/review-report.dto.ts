import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportStatus } from '../../database/entities/enums';

export class ReviewReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsString()
  @IsOptional()
  adminNote?: string;
}
