import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createPublicClient, http } from 'viem';
import { worldlandMainnet } from '../common/chains';
import { Listing, ListingStatus } from '../database/entities/listing.entity';
import { Nft } from '../database/entities/nft.entity';

export interface RequestMetric {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

export interface ApiMetrics {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  avgDuration: number;
  p95Duration: number;
  slowestEndpoints: { path: string; method: string; avgDuration: number; count: number }[];
}

export interface BlockchainMetrics {
  blockNumber: string;
  lagSeconds: number;
  healthy: boolean;
}

export interface BusinessMetrics {
  sales24h: number;
  volume24h: string;
  mints24h: number;
  activeUsers7d: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly requestMetrics: RequestMetric[] = [];
  private readonly MAX_ENTRIES = 10000;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Nft)
    private readonly nftRepository: Repository<Nft>,
  ) {}

  /**
   * Record an incoming request metric (called by LoggingInterceptor)
   */
  recordRequest(
    path: string,
    method: string,
    statusCode: number,
    duration: number,
  ): void {
    this.requestMetrics.push({
      path,
      method,
      statusCode,
      duration,
      timestamp: Date.now(),
    });

    // Evict oldest entries when exceeding max
    if (this.requestMetrics.length > this.MAX_ENTRIES) {
      this.requestMetrics.splice(
        0,
        this.requestMetrics.length - this.MAX_ENTRIES,
      );
    }
  }

  /**
   * Get API performance metrics for the last N minutes
   */
  getApiMetrics(minutes = 60): ApiMetrics {
    const cutoff = Date.now() - minutes * 60 * 1000;
    const recent = this.requestMetrics.filter((m) => m.timestamp >= cutoff);

    const totalRequests = recent.length;
    const errorCount = recent.filter((m) => m.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    const durations = recent.map((m) => m.duration);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const p95Duration = this.percentile(durations, 95);

    // Aggregate by endpoint for slowest top 5
    const endpointMap = new Map<
      string,
      { totalDuration: number; count: number; method: string; path: string }
    >();
    for (const m of recent) {
      const key = `${m.method}:${m.path}`;
      const existing = endpointMap.get(key);
      if (existing) {
        existing.totalDuration += m.duration;
        existing.count += 1;
      } else {
        endpointMap.set(key, {
          totalDuration: m.duration,
          count: 1,
          method: m.method,
          path: m.path,
        });
      }
    }

    const slowestEndpoints = Array.from(endpointMap.values())
      .map((e) => ({
        path: e.path,
        method: e.method,
        avgDuration: Math.round(e.totalDuration / e.count),
        count: e.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    return {
      totalRequests,
      errorCount,
      errorRate: Math.round(errorRate * 10000) / 100, // percentage with 2 decimals
      avgDuration: Math.round(avgDuration),
      p95Duration,
      slowestEndpoints,
    };
  }

  /**
   * Get blockchain sync metrics via RPC
   */
  async getBlockchainMetrics(): Promise<BlockchainMetrics> {
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

      return {
        blockNumber: blockNumber.toString(),
        lagSeconds,
        healthy: lagSeconds < 120,
      };
    } catch (error) {
      this.logger.error(`Blockchain metrics fetch failed: ${error.message}`);
      return {
        blockNumber: '0',
        lagSeconds: -1,
        healthy: false,
      };
    }
  }

  /**
   * Get business metrics from the database
   */
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      // 24h sales count
      const sales24h = await this.listingRepository
        .createQueryBuilder('l')
        .where('l.status = :status', { status: ListingStatus.SOLD })
        .andWhere('l.soldAt > :since', { since: twentyFourHoursAgo })
        .getCount();

      // 24h volume (sum of price in wei)
      const volumeResult = await this.listingRepository
        .createQueryBuilder('l')
        .select('COALESCE(SUM(CAST(l.price AS NUMERIC)), 0)', 'total')
        .where('l.status = :status', { status: ListingStatus.SOLD })
        .andWhere('l.soldAt > :since', { since: twentyFourHoursAgo })
        .getRawOne();
      const volume24h = volumeResult?.total?.toString() || '0';

      // 24h mints count
      const mints24h = await this.nftRepository
        .createQueryBuilder('n')
        .where('n.createdAt > :since', { since: twentyFourHoursAgo })
        .getCount();

      // 7d active users (distinct owners who had NFT activity)
      const activeUsersResult = await this.nftRepository
        .createQueryBuilder('n')
        .select('COUNT(DISTINCT n.owner)', 'count')
        .where('n.updatedAt > :since', { since: sevenDaysAgo })
        .getRawOne();
      const activeUsers7d = parseInt(activeUsersResult?.count || '0', 10);

      return {
        sales24h,
        volume24h,
        mints24h,
        activeUsers7d,
      };
    } catch (error) {
      this.logger.error(`Business metrics fetch failed: ${error.message}`);
      return {
        sales24h: 0,
        volume24h: '0',
        mints24h: 0,
        activeUsers7d: 0,
      };
    }
  }

  /**
   * Calculate the p-th percentile from an array of numbers
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}
