import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';
import {
  normalizeUgandaPhone,
  formatUgandaPhone,
} from '../../common/phone/phone.util.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

@Injectable()
export class AuthService {
  private readonly loginRateLimit = new Map<string, RateLimitEntry>();

  private readonly maxLoginAttempts = 5;
  private readonly rateLimitWindowMs = 15 * 60 * 1000;
  private readonly blockDurationMs = 15 * 60 * 1000;

  private readonly authTokenLifetimeMs = 30 * 24 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private checkRateLimit(key: string) {
    const now = Date.now();
    const entry = this.loginRateLimit.get(key);

    if (!entry) {
      return;
    }

    if (entry.blockedUntil && now < entry.blockedUntil) {
      throw new UnauthorizedException(
        'Too many login attempts. Please try again later.',
      );
    }

    if (now - entry.firstAttemptAt >= this.rateLimitWindowMs) {
      this.loginRateLimit.delete(key);
    }
  }

  private recordFailedLogin(key: string) {
    const now = Date.now();
    const entry = this.loginRateLimit.get(key);

    if (!entry || now - entry.firstAttemptAt >= this.rateLimitWindowMs) {
      this.loginRateLimit.set(key, {
        attempts: 1,
        firstAttemptAt: now,
      });
      return;
    }

    entry.attempts += 1;

    if (entry.attempts >= this.maxLoginAttempts) {
      entry.blockedUntil = now + this.blockDurationMs;
    }

    this.loginRateLimit.set(key, entry);
  }

  private clearRateLimit(key: string) {
    this.loginRateLimit.delete(key);
  }

  async register(dto: RegisterDto) {
    let phone: string;

    try {
      phone = normalizeUgandaPhone(dto.phone);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid Uganda phone number.',
      );
    }

    const name = dto.name?.trim();
    const pin = dto.pin?.trim();

    if (!name || name.length < 2 || name.length > 100) {
      throw new BadRequestException(
        'Name must contain between 2 and 100 characters.',
      );
    }

    if (!/^\d{4}$/.test(pin ?? '')) {
      throw new BadRequestException('PIN must be exactly 4 digits.');
    }

    if (!['BODA', 'VEHICLE'].includes(dto.vehicleType)) {
      throw new BadRequestException('Vehicle type must be BODA or VEHICLE.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account already exists for this phone number.',
      );
    }

    const pinHash = await argon2.hash(pin, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: `${name}'s account`,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          phone,
          name,
          pinHash,
        },
      });

      const vehicle = await tx.vehicle.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          type: dto.vehicleType,
        },
      });

      return {
        tenant,
        user,
        vehicle,
      };
    });

    return {
      user: {
        id: result.user.id,
        phone: formatUgandaPhone(result.user.phone),
        name: result.user.name,
      },
      vehicle: {
        id: result.vehicle.id,
        type: result.vehicle.type,
      },
    };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    let phone: string;

    try {
      phone = normalizeUgandaPhone(dto.phone);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid Uganda phone number.',
      );
    }

    const pin = dto.pin?.trim();

    if (!/^\d{4}$/.test(pin ?? '')) {
      throw new BadRequestException('PIN must be exactly 4 digits.');
    }

    const rateLimitKey = `${ipAddress ?? 'unknown'}:${phone}`;

    this.checkRateLimit(rateLimitKey);

    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        tenantId: true,
        phone: true,
        name: true,
        pinHash: true,
        vehicles: {
          select: {
            id: true,
            type: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
      },
    });

    if (!user) {
      this.recordFailedLogin(rateLimitKey);
      throw new UnauthorizedException('Invalid phone number or PIN.');
    }

    const validPin = await argon2.verify(user.pinHash, pin);

    if (!validPin) {
      this.recordFailedLogin(rateLimitKey);
      throw new UnauthorizedException('Invalid phone number or PIN.');
    }

    this.clearRateLimit(rateLimitKey);

    const vehicle = user.vehicles[0];

    if (!vehicle) {
      throw new UnauthorizedException(
        'No vehicle is configured for this account.',
      );
    }

    const device = await this.prisma.device.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        name: dto.deviceName?.trim() || 'Unknown device',
        lastSeenAt: new Date(),
      },
    });

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date(Date.now() + this.authTokenLifetimeMs);

    const authSession = await this.prisma.authSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        deviceId: device.id,
        tokenHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        tenantId: user.tenantId,
        phone: formatUgandaPhone(user.phone),
        name: user.name,
      },
      device: {
        id: device.id,
        name: device.name,
      },
      authSessionId: authSession.id,
      vehicle: {
        id: vehicle.id,
        type: vehicle.type,
      },
    };
  }

  async logout(authSessionId: string, userId: string) {
    const result = await this.prisma.authSession.updateMany({
      where: {
        id: authSessionId,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      success: result.count > 0,
    };
  }

  async registerDevice(userId: string, tenantId: string, name?: string) {
    const device = await this.prisma.device.create({
      data: {
        tenantId,
        userId,
        name: name?.trim() || 'Unknown device',
        lastSeenAt: new Date(),
      },
    });

    return {
      id: device.id,
      name: device.name,
      createdAt: device.createdAt.toISOString(),
    };
  }

  async listDevices(userId: string, tenantId: string) {
    const devices = await this.prisma.device.findMany({
      where: {
        userId,
        tenantId,
      },
      orderBy: {
        lastSeenAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return devices;
  }
}
