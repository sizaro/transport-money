import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service.js'
import type {
  EndSessionDto,
  StartSessionDto,
} from './dto/session.dto.js'

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedSession(
    userId: string,
    tenantId: string,
    sessionId: string,
  ) {
    const session =
      await this.prisma.session.findFirst({
        where: {
          id: sessionId,
          userId,
          tenantId,
        },
        include: {
          vehicle: true,
        },
      })

    if (!session) {
      throw new NotFoundException(
        'Session not found.',
      )
    }

    return session
  }

  private async buildSummary(
    userId: string,
    tenantId: string,
    sessionId: string,
  ) {
    const session =
      await this.getOwnedSession(
        userId,
        tenantId,
        sessionId,
      )

    const [
      incomeEntries,
      expenseEntries,
      changeEntries,
    ] = await Promise.all([
      this.prisma.incomeEntry.findMany({
        where: {
          sessionId,
          userId,
          tenantId,
          voidedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),

      this.prisma.expenseEntry.findMany({
        where: {
          sessionId,
          userId,
          tenantId,
          voidedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),

      this.prisma.changeEntry.findMany({
        where: {
          sessionId,
          userId,
          tenantId,
          voidedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ])

    const received = incomeEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    )

    const expenses = expenseEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    )

    const endTime =
      session.endedAt?.getTime() ??
      Date.now()

    const workedMinutes = Math.max(
      0,
      Math.floor(
        (endTime -
          session.startedAt.getTime()) /
          60_000,
      ),
    )

    return {
      session,
      incomeEntries,
      expenseEntries,
      changeEntries,
      received,
      expenses,
      made: received - expenses,
      workedMinutes,
    }
  }

  async getActive(
    userId: string,
    tenantId: string,
  ) {
    const session =
      await this.prisma.session.findFirst({
        where: {
          userId,
          tenantId,
          endedAt: null,
        },
        orderBy: {
          startedAt: 'asc',
        },
        include: {
          vehicle: true,
        },
      })

    if (!session) {
      return null
    }

    return this.buildSummary(
      userId,
      tenantId,
      session.id,
    )
  }

  async start(
    userId: string,
    tenantId: string,
    dto: StartSessionDto,
  ) {
    const active =
      await this.prisma.session.findFirst({
        where: {
          userId,
          tenantId,
          endedAt: null,
        },
      })

    if (active) {
      throw new BadRequestException(
        'You already have an active session.',
      )
    }

    let vehicle

    if (dto.vehicleId) {
      vehicle =
        await this.prisma.vehicle.findFirst({
          where: {
            id: dto.vehicleId,
            userId,
            tenantId,
          },
        })

      if (!vehicle) {
        throw new NotFoundException(
          'Vehicle not found.',
        )
      }
    } else {
      vehicle =
        await this.prisma.vehicle.findFirst({
          where: {
            userId,
            tenantId,
          },
          orderBy: {
            createdAt: 'asc',
          },
        })
    }

    if (!vehicle) {
      throw new BadRequestException(
        'No vehicle is configured.',
      )
    }

    const id = dto.id ?? crypto.randomUUID()

    const existing =
      await this.prisma.session.findUnique({
        where: { id },
      })

    if (existing) {
      if (
        existing.userId !== userId ||
        existing.tenantId !== tenantId
      ) {
        throw new BadRequestException(
          'Session does not belong to this account.',
        )
      }

      return this.buildSummary(
        userId,
        tenantId,
        id,
      )
    }

    const startedAt = dto.startedAt
      ? new Date(dto.startedAt)
      : new Date()

    if (Number.isNaN(startedAt.getTime())) {
      throw new BadRequestException(
        'Invalid session start time.',
      )
    }

    await this.prisma.session.create({
      data: {
        id,
        tenantId,
        userId,
        vehicleId: vehicle.id,
        startedAt,
      },
    })

    return this.buildSummary(
      userId,
      tenantId,
      id,
    )
  }

  async end(
    userId: string,
    tenantId: string,
    sessionId: string,
    dto: EndSessionDto,
  ) {
    const session =
      await this.getOwnedSession(
        userId,
        tenantId,
        sessionId,
      )

    if (session.endedAt) {
      return this.buildSummary(
        userId,
        tenantId,
        sessionId,
      )
    }

    const endedAt = dto.endedAt
      ? new Date(dto.endedAt)
      : new Date()

    if (Number.isNaN(endedAt.getTime())) {
      throw new BadRequestException(
        'Invalid session end time.',
      )
    }

    if (
      endedAt.getTime() <
      session.startedAt.getTime()
    ) {
      throw new BadRequestException(
        'Session cannot end before it starts.',
      )
    }

    await this.prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        endedAt,
      },
    })

    return this.buildSummary(
      userId,
      tenantId,
      sessionId,
    )
  }

  async summary(
    userId: string,
    tenantId: string,
    sessionId: string,
  ) {
    return this.buildSummary(
      userId,
      tenantId,
      sessionId,
    )
  }

  async list(
    userId: string,
    tenantId: string,
  ) {
    const sessions =
      await this.prisma.session.findMany({
        where: {
          userId,
          tenantId,
        },
        include: {
          vehicle: true,
          incomeEntries: {
            where: {
              voidedAt: null,
            },
            select: {
              amount: true,
            },
          },
          expenseEntries: {
            where: {
              voidedAt: null,
            },
            select: {
              amount: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      })

    return sessions.map((session) => {
      const received =
        session.incomeEntries.reduce(
          (sum, entry) =>
            sum + entry.amount,
          0,
        )

      const expenses =
        session.expenseEntries.reduce(
          (sum, entry) =>
            sum + entry.amount,
          0,
        )

      return {
        ...session,
        incomeEntries: undefined,
        expenseEntries: undefined,
        received,
        expenses,
        made: received - expenses,
      }
    })
  }
}
