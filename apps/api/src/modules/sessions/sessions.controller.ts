import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { SessionsService } from './sessions.service.js'
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js'
import type { StartSessionDto, EndSessionDto } from './dto/session.dto.js'
import { CurrentUser } from '../../common/auth/current-user.decorator.js'

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('active')
  getActive(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.getActive(user)
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.list(user)
  }

  @Post()
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartSessionDto,
  ) {
    return this.sessionsService.start(user, dto)
  }

  @Post(':id/end')
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() dto: EndSessionDto,
  ) {
    return this.sessionsService.end(user, sessionId, dto)
  }

  @Get(':id')
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.summary(user, sessionId)
  }
}
