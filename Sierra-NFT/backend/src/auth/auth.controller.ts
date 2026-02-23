import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SiweVerifyDto } from './dto/siwe-verify.dto';
import { JwtAuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('nonce')
  async getNonce(@Query('address') address: string) {
    const nonce = await this.authService.generateNonce(address);
    return { nonce };
  }

  @Post('verify')
  async verify(
    @Body() dto: SiweVerifyDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, token } = await this.authService.verifySiwe(
      dto.message,
      dto.signature,
    );

    // Set JWT as HttpOnly cookie
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        address: user.address,
        nickname: user.nickname,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() request: Request) {
    const user = await this.authService.findById(request.user['userId']);

    if (!user) {
      return { user: null };
    }

    return {
      user: {
        id: user.id,
        address: user.address,
        nickname: user.nickname,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    };
  }
}
