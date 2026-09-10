import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common'
import { CurrentUser } from '../../common/auth/current-user.decorator.js'
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js'
import { SessionsService } from './sessions.service.js'
import type {
  StartSessionDto,
  EndSessionDto,
} from './dto/session.dto.js'

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
  ) {}

  @Get('active')
  getActive(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessionsService.getActive(
      user.userId,
      user.tenantId,
    )
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sessionsService.list(
      user.userId,
      user.tenantId,
    )
  }

  @Post()
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartSessionDto,
  ) {
    return this.sessionsService.start(
      user.userId,
      user.tenantId,
      dto,
    )
  }

  @Post(':id/end')
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() dto: EndSessionDto,
  ) {
    return this.sessionsService.end(
      user.userId,
      user.tenantId,
      sessionId,
      dto,
    )
  }

  @Get(':id')
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.summary(
      user.userId,
      user.tenantId,
      sessionId,
    )
  }
}
