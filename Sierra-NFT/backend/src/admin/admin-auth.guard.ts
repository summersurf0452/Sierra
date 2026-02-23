import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminJwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.admin_token;

    if (!token) {
      throw new UnauthorizedException('Admin authentication required');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>(
          'ADMIN_JWT_SECRET',
          'sierra-admin-secret-change-me',
        ),
      });
      if (payload.role !== 'admin') {
        throw new UnauthorizedException();
      }
      request.admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid admin token');
    }
  }
}
