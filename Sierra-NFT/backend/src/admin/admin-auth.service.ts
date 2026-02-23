import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminAuthService {
  private readonly adminUsername: string;
  private readonly adminPasswordHash: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.adminUsername = this.configService.get<string>(
      'ADMIN_USERNAME',
      'root',
    );
    // Plain password stored in env variable, hashed on service startup
    const plainPassword = this.configService.get<string>(
      'ADMIN_PASSWORD',
      'hibay2026',
    );
    this.adminPasswordHash = bcrypt.hashSync(plainPassword, 10);
  }

  async validateAdmin(username: string, password: string): Promise<boolean> {
    if (username !== this.adminUsername) {
      return false;
    }
    return bcrypt.compare(password, this.adminPasswordHash);
  }

  async login(username: string, password: string) {
    const isValid = await this.validateAdmin(username, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const payload = { sub: 'admin', role: 'admin' };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        'ADMIN_JWT_SECRET',
        'sierra-admin-secret-change-me',
      ),
      expiresIn: '4h',
    });

    return { token };
  }
}
