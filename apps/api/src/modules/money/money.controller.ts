import {
  Body,
  Controller,
  Param,
  Post,
} from '@nestjs/common'

import { CurrentUser } from '../../common/auth/current-user.decorator.js'
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js'

import { MoneyService } from './money.service.js'
import type {
  AddChangeDto,
  AddExpenseDto,
  AddIncomeDto,
} from './dto/money.dto.js'

@Controller('money')
export class MoneyController {
  constructor(
    private readonly moneyService: MoneyService,
  ) {}

  @Post('income')
  addIncome(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddIncomeDto,
  ) {
    return this.moneyService.addIncome(
      user.userId,
      user.tenantId,
      dto,
    )
  }

  @Post('expense')
  addExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddExpenseDto,
  ) {
    return this.moneyService.addExpense(
      user.userId,
      user.tenantId,
      dto,
    )
  }

  @Post('change')
  addChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddChangeDto,
  ) {
    return this.moneyService.addChange(
      user.userId,
      user.tenantId,
      dto,
    )
  }

  @Post('income/:id/void')
  voidIncome(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.moneyService.voidIncome(
      user.userId,
      user.tenantId,
      id,
    )
  }

  @Post('expense/:id/void')
  voidExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.moneyService.voidExpense(
      user.userId,
      user.tenantId,
      id,
    )
  }

  @Post('change/:id/void')
  voidChange(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.moneyService.voidChange(
      user.userId,
      user.tenantId,
      id,
    )
  }

  @Post('income/undo')
  undoIncome(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moneyService.undoLastIncome(
      user.userId,
      user.tenantId,
    )
  }

  @Post('expense/undo')
  undoExpense(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moneyService.undoLastExpense(
      user.userId,
      user.tenantId,
    )
  }
}
