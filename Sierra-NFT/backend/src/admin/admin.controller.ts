import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { AdminService } from './admin.service';
import { AdminJwtAuthGuard } from './admin-auth.guard';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ReviewReportDto } from './dto/review-report.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly adminService: AdminService,
  ) {}

  @Post('login')
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token } = await this.adminAuthService.login(
      dto.username,
      dto.password,
    );

    response.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      path: '/',
    });

    return { success: true };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('admin_token');
    return { success: true };
  }

  @Get('me')
  @UseGuards(AdminJwtAuthGuard)
  async me() {
    return { authenticated: true };
  }

  // --- Collection verification ---

  @Patch('collections/:id/verify')
  @UseGuards(AdminJwtAuthGuard)
  async verifyCollection(@Param('id') id: string) {
    return this.adminService.verifyCollection(id);
  }

  @Patch('collections/:id/unverify')
  @UseGuards(AdminJwtAuthGuard)
  async unverifyCollection(@Param('id') id: string) {
    return this.adminService.unverifyCollection(id);
  }

  // --- Collection list ---

  @Get('collections')
  @UseGuards(AdminJwtAuthGuard)
  async getCollections(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getCollections(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  // --- Reports ---

  @Get('reports')
  @UseGuards(AdminJwtAuthGuard)
  async getReports(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getReports(
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch('reports/:id/review')
  @UseGuards(AdminJwtAuthGuard)
  async reviewReport(
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
  ) {
    return this.adminService.reviewReport(id, dto);
  }

  // --- Hide/Unhide ---

  @Patch('collections/:id/hide')
  @UseGuards(AdminJwtAuthGuard)
  async hideCollection(@Param('id') id: string) {
    return this.adminService.hideCollection(id);
  }

  @Patch('collections/:id/unhide')
  @UseGuards(AdminJwtAuthGuard)
  async unhideCollection(@Param('id') id: string) {
    return this.adminService.unhideCollection(id);
  }

  @Patch('nfts/:id/hide')
  @UseGuards(AdminJwtAuthGuard)
  async hideNft(@Param('id') id: string) {
    return this.adminService.hideNft(id);
  }

  @Patch('nfts/:id/unhide')
  @UseGuards(AdminJwtAuthGuard)
  async unhideNft(@Param('id') id: string) {
    return this.adminService.unhideNft(id);
  }

  // --- Stats ---

  @Get('stats')
  @UseGuards(AdminJwtAuthGuard)
  async getStats() {
    return this.adminService.getDashboardStats();
  }
}
