import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggingInterceptor } from './common/logging.interceptor';
import databaseConfig from './config/database.config';
import blockchainConfig from './config/blockchain.config';
import { IndexerModule } from './indexer/indexer.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CollectionModule } from './collection/collection.module';
import { NftModule } from './nft/nft.module';
import { ListingModule } from './listing/listing.module';
import { SearchModule } from './search/search.module';
import { AuctionModule } from './auction/auction.module';
import { OfferModule } from './offer/offer.module';
import { AdminModule } from './admin/admin.module';
import { ReportModule } from './report/report.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, blockchainConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 20,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
    ]),
    CacheModule.register({
      isGlobal: true,
      ttl: 30000,
      max: 200,
    }),
    IndexerModule,
    IpfsModule,
    AuthModule,
    UserModule,
    CollectionModule,
    NftModule,
    ListingModule,
    SearchModule,
    AuctionModule,
    OfferModule,
    AdminModule,
    ReportModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
