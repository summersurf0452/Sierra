import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { BlockchainHealthIndicator } from './blockchain-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [BlockchainHealthIndicator],
})
export class HealthModule {}
