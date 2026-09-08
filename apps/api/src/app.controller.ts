import { Controller, Get } from '@nestjs/common'
import { PrismaService } from './database/prisma.service.js'
import { Public } from './common/auth/public.decorator.js'

@Controller('health')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    const startedAt = Date.now()

    await this.prisma.$queryRaw`SELECT 1`

    return {
      status: 'ok',
      service: 'transport-money-api',
      database: 'ok',
      responseTimeMs: Date.now() - startedAt,
    }
  }
}
