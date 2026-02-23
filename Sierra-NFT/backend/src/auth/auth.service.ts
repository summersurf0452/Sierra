import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiweMessage } from 'siwe';
import { User } from '../database/entities/user.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async generateNonce(address: string): Promise<string> {
    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    const normalizedAddress = address.toLowerCase();
    const nonce = randomBytes(16).toString('hex');

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      user = this.userRepository.create({
        address: normalizedAddress,
        nonce,
      });
    } else {
      user.nonce = nonce;
    }

    await this.userRepository.save(user);

    return nonce;
  }

  async verifySiwe(message: string, signature: string): Promise<{ user: User; token: string }> {
    try {
      // Verify SIWE message
      const siweMessage = new SiweMessage(message);
      const fields = await siweMessage.verify({ signature });

      if (!fields.success) {
        throw new UnauthorizedException('Invalid signature');
      }

      const normalizedAddress = siweMessage.address.toLowerCase();

      // Look up user
      const user = await this.userRepository.findOne({
        where: { address: normalizedAddress },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify nonce
      if (!user.nonce || user.nonce !== siweMessage.nonce) {
        throw new UnauthorizedException('Invalid or expired nonce');
      }

      // Clear nonce (single-use)
      user.nonce = null;
      await this.userRepository.save(user);

      // Generate JWT
      const payload = { sub: user.id, address: user.address };
      const token = this.jwtService.sign(payload);

      return { user, token };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('SIWE verification failed');
    }
  }

  async findOrCreateUser(address: string): Promise<User> {
    const normalizedAddress = address.toLowerCase();

    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      user = this.userRepository.create({
        address: normalizedAddress,
      });
      await this.userRepository.save(user);
    }

    return user;
  }

  async findById(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }
}
