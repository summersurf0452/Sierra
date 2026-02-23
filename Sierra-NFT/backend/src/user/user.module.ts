import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../database/entities/user.entity';
import { Nft } from '../database/entities/nft.entity';
import { Listing } from '../database/entities/listing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Nft, Listing])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
