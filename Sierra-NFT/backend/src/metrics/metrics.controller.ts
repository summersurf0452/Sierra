import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';
import { AdminJwtAuthGuard } from '../admin/admin-auth.guard';

@Controller('admin/metrics')
@UseGuards(AdminJwtAuthGuard)
@SkipThrottle()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics() {
    const [api, blockchain, business] = await Promise.all([
      this.metricsService.getApiMetrics(),
      this.metricsService.getBlockchainMetrics(),
      this.metricsService.getBusinessMetrics(),
    ]);

    return { api, blockchain, business };
  }
}
