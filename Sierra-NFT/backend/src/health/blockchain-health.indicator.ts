import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { createPublicClient, http } from 'viem';
import { worldlandMainnet } from '../common/chains';

@Injectable()
export class BlockchainHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(BlockchainHealthIndicator.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const rpcUrl = this.configService.get<string>(
      'blockchain.worldlandRpcUrl',
    );

    try {
      const client = createPublicClient({
        chain: worldlandMainnet,
        transport: http(rpcUrl),
      });

      const blockNumber = await client.getBlockNumber();
      const block = await client.getBlock({ blockNumber });

      const now = Math.floor(Date.now() / 1000);
      const lagSeconds = now - Number(block.timestamp);
      const isHealthy = lagSeconds < 120;

      const result = this.getStatus(key, isHealthy, {
        blockNumber: blockNumber.toString(),
        lagSeconds,
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError(
        'Blockchain sync lag exceeds threshold',
        result,
      );
    } catch (error) {
      if (error instanceof HealthCheckError) {
        throw error;
      }

      this.logger.error(
        `Blockchain health check failed: ${error.message}`,
      );

      throw new HealthCheckError(
        'Blockchain unreachable',
        this.getStatus(key, false, {
          message: error.message,
        }),
      );
    }
  }
}
