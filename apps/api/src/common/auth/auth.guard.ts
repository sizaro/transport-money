import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createHash } from 'node:crypto'
import { PrismaService } from '../../database/prisma.service.js'
import { IS_PUBLIC_KEY } from './public.decorator.js'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest()

    const authorization = request.headers.authorization

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token is required.')
    }

    const token = authorization.slice('Bearer '.length).trim()

    if (!token) {
      throw new UnauthorizedException('Authentication token is required.')
    }

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex')

    const authSession = await this.prisma.authSession.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        deviceId: true,
        expiresAt: true,
        revokedAt: true,
      },
    })

    if (!authSession) {
      throw new UnauthorizedException('Invalid authentication token.')
    }

    if (authSession.revokedAt) {
      throw new UnauthorizedException('Authentication token has been revoked.')
    }

    if (authSession.expiresAt <= new Date()) {
      throw new UnauthorizedException('Authentication token has expired.')
    }

    request.user = {
      userId: authSession.userId,
      tenantId: authSession.tenantId,
      deviceId: authSession.deviceId,
      authSessionId: authSession.id,
    }

    await this.prisma.authSession.update({
      where: { id: authSession.id },
      data: { lastUsedAt: new Date() },
    })

    return true
  }
}
