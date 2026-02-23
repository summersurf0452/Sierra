import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':address')
  async getUserProfile(@Param('address') address: string) {
    const user = await this.userService.findByAddress(address);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stats = await this.userService.getUserStats(address);

    return {
      user: {
        id: user.id,
        address: user.address,
        nickname: user.nickname,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      stats,
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @Req() request: Request,
    @Body() dto: UpdateProfileDto,
  ) {
    const userId = request.user['userId'];
    const updatedUser = await this.userService.updateProfile(userId, dto);

    return {
      user: {
        id: updatedUser.id,
        address: updatedUser.address,
        nickname: updatedUser.nickname,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
      },
    };
  }

  @Get('me/activity')
  @UseGuards(JwtAuthGuard)
  async getMyActivity(@Req() request: Request) {
    const userId = request.user['userId'];
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activity = await this.userService.getUserActivity(user.address);

    return activity;
  }
}
