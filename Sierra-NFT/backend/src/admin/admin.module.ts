import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from '../database/entities/collection.entity';
import { Nft } from '../database/entities/nft.entity';
import { Report } from '../database/entities/report.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtAuthGuard } from './admin-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collection, Nft, Report]),
    JwtModule.register({}),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthService, AdminJwtAuthGuard],
})
export class AdminModule {}
