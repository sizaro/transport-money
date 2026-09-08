import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service.js'
import type {
  AddChangeDto,
  AddExpenseDto,
  AddIncomeDto,
} from './dto/money.dto.js'

@Injectable()
export class MoneyService {
  constructor(private readonly prisma: PrismaService) {}

  private async activeSession(
    userId: string,
    tenantId: string,
    sessionId?: string,
  ) {
    const session =
      await this.prisma.session.findFirst({
        where: sessionId
          ? {
              id: sessionId,
              userId,
              tenantId,
              endedAt: null,
            }
          : {
              userId,
              tenantId,
              endedAt: null,
            },
        orderBy: {
          startedAt: 'asc',
        },
      })

    if (!session) {
      throw new BadRequestException(
        'No active session.',
      )
    }

    return session
  }

  async addIncome(
    userId: string,
    tenantId: string,
    dto: AddIncomeDto,
  ) {
    if (
      !Number.isInteger(dto.amount) ||
      dto.amount <= 0
    ) {
      throw new BadRequestException(
        'Amount must be a positive whole number.',
      )
    }

    const session =
      await this.activeSession(
        userId,
        tenantId,
        dto.sessionId,
      )

    const id = dto.id ?? crypto.randomUUID()

    const existing =
      await this.prisma.incomeEntry.findUnique({
        where: { id },
      })

    if (existing) {
      if (
        existing.userId !== userId ||
        existing.tenantId !== tenantId
      ) {
        throw new BadRequestException(
          'Income entry does not belong to this account.',
        )
      }

      return existing
    }

    const createdAt = dto.createdAt
      ? new Date(dto.createdAt)
      : new Date()

    if (Number.isNaN(createdAt.getTime())) {
      throw new BadRequestException(
        'Invalid income timestamp.',
      )
    }

    return this.prisma.incomeEntry.create({
      data: {
        id,
        tenantId,
        userId,
        sessionId: session.id,
        amount: dto.amount,
        entryMethod:
          dto.entryMethod ?? 'QUICK_AMOUNT',
        createdAt,
      },
    })
  }

  async addExpense(
    userId: string,
    tenantId: string,
    dto: AddExpenseDto,
  ) {
    if (
      !Number.isInteger(dto.amount) ||
      dto.amount <= 0
    ) {
      throw new BadRequestException(
        'Amount must be a positive whole number.',
      )
    }

    if (!dto.category?.trim()) {
      throw new BadRequestException(
        'Expense category is required.',
      )
    }

    const session =
      await this.activeSession(
        userId,
        tenantId,
        dto.sessionId,
      )

    const id = dto.id ?? crypto.randomUUID()

    const existing =
      await this.prisma.expenseEntry.findUnique({
        where: { id },
      })

    if (existing) {
      if (
        existing.userId !== userId ||
        existing.tenantId !== tenantId
      ) {
        throw new BadRequestException(
          'Expense entry does not belong to this account.',
        )
      }

      return existing
    }

    const createdAt = dto.createdAt
      ? new Date(dto.createdAt)
      : new Date()

    if (Number.isNaN(createdAt.getTime())) {
      throw new BadRequestException(
        'Invalid expense timestamp.',
      )
    }

    return this.prisma.expenseEntry.create({
      data: {
        id,
        tenantId,
        userId,
        sessionId: session.id,
        category: dto.category.trim(),
        amount: dto.amount,
        createdAt,
      },
    })
  }

  async addChange(
    userId: string,
    tenantId: string,
    dto: AddChangeDto,
  ) {
    if (
      !Number.isInteger(dto.amountDue) ||
      dto.amountDue <= 0
    ) {
      throw new BadRequestException(
        'Amount due must be positive.',
      )
    }

    if (
      !Number.isInteger(dto.amountGiven) ||
      dto.amountGiven < dto.amountDue
    ) {
      throw new BadRequestException(
        'Amount given must cover the fare.',
      )
    }

    const session =
      await this.activeSession(
        userId,
        tenantId,
        dto.sessionId,
      )

    const changeId =
      dto.id ?? crypto.randomUUID()

    const existing =
      await this.prisma.changeEntry.findUnique({
        where: { id: changeId },
      })

    if (existing) {
      if (
        existing.userId !== userId ||
        existing.tenantId !== tenantId
      ) {
        throw new BadRequestException(
          'Change entry does not belong to this account.',
        )
      }

      return existing
    }

    const incomeId =
      dto.incomeEntryId ?? crypto.randomUUID()

    const createdAt = dto.createdAt
      ? new Date(dto.createdAt)
      : new Date()

    if (Number.isNaN(createdAt.getTime())) {
      throw new BadRequestException(
        'Invalid change timestamp.',
      )
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const existingIncome =
          await transaction.incomeEntry.findUnique({
            where: {
              id: incomeId,
            },
          })

        if (!existingIncome) {
          await transaction.incomeEntry.create({
            data: {
              id: incomeId,
              tenantId,
              userId,
              sessionId: session.id,
              amount: dto.amountDue,
              entryMethod: 'CHANGE',
              createdAt,
            },
          })
        }

        return transaction.changeEntry.create({
          data: {
            id: changeId,
            tenantId,
            userId,
            sessionId: session.id,
            amountDue: dto.amountDue,
            amountGiven: dto.amountGiven,
            changeReturned:
              dto.amountGiven -
              dto.amountDue,
            amountReceived:
              dto.amountDue,
            incomeEntryId: incomeId,
            createdAt,
          },
        })
      },
    )
  }

  async voidIncome(
    userId: string,
    tenantId: string,
    id: string,
  ) {
    const entry =
      await this.prisma.incomeEntry.findFirst({
        where: {
          id,
          userId,
          tenantId,
        },
      })

    if (!entry) {
      throw new NotFoundException(
        'Income entry not found.',
      )
    }

    if (entry.voidedAt) {
      return entry
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const updated =
          await transaction.incomeEntry.update({
            where: { id },
            data: {
              voidedAt: new Date(),
            },
          })

        await transaction.changeEntry.updateMany({
          where: {
            incomeEntryId: id,
            voidedAt: null,
          },
          data: {
            voidedAt: new Date(),
          },
        })

        return updated
      },
    )
  }

  async voidExpense(
    userId: string,
    tenantId: string,
    id: string,
  ) {
    const entry =
      await this.prisma.expenseEntry.findFirst({
        where: {
          id,
          userId,
          tenantId,
        },
      })

    if (!entry) {
      throw new NotFoundException(
        'Expense entry not found.',
      )
    }

    if (entry.voidedAt) {
      return entry
    }

    return this.prisma.expenseEntry.update({
      where: { id },
      data: {
        voidedAt: new Date(),
      },
    })
  }

  async voidChange(
    userId: string,
    tenantId: string,
    id: string,
  ) {
    const entry =
      await this.prisma.changeEntry.findFirst({
        where: {
          id,
          userId,
          tenantId,
        },
      })

    if (!entry) {
      throw new NotFoundException(
        'Change entry not found.',
      )
    }

    if (entry.voidedAt) {
      return entry
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const updated =
          await transaction.changeEntry.update({
            where: { id },
            data: {
              voidedAt: new Date(),
            },
          })

        if (entry.incomeEntryId) {
          await transaction.incomeEntry.updateMany({
            where: {
              id: entry.incomeEntryId,
              voidedAt: null,
            },
            data: {
              voidedAt: new Date(),
            },
          })
        }

        return updated
      },
    )
  }

  async undoLastIncome(
    userId: string,
    tenantId: string,
  ) {
    const session =
      await this.activeSession(
        userId,
        tenantId,
      )

    const entry =
      await this.prisma.incomeEntry.findFirst({
        where: {
          sessionId: session.id,
          userId,
          tenantId,
          voidedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

    if (!entry) {
      throw new NotFoundException(
        'No income entry to undo.',
      )
    }

    return this.voidIncome(
      userId,
      tenantId,
      entry.id,
    )
  }

  async undoLastExpense(
    userId: string,
    tenantId: string,
  ) {
    const session =
      await this.activeSession(
        userId,
        tenantId,
      )

    const entry =
      await this.prisma.expenseEntry.findFirst({
        where: {
          sessionId: session.id,
          userId,
          tenantId,
          voidedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

    if (!entry) {
      throw new NotFoundException(
        'No expense entry to undo.',
      )
    }

    return this.voidExpense(
      userId,
      tenantId,
      entry.id,
    )
  }
}
