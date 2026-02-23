import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReport(
    @Body() dto: CreateReportDto,
    @Req() request: Request,
  ) {
    const reporter = (request as any).user['address'];
    return this.reportService.createReport(dto, reporter);
  }
}
