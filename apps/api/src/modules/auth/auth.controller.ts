import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common'
import { AuthService } from './auth.service.js'
import type { RegisterDto } from './dto/register.dto.js'
import type { LoginDto } from './dto/login.dto.js'
import type { RegisterDeviceDto } from './dto/register-device.dto.js'
import { Public } from '../../common/auth/public.decorator.js'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Public()
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
  ) {
    return this.authService.login(dto, ipAddress)
  }

  @Post('logout')
  logout(@Req() request: any) {
    if (!request.user) {
      throw new UnauthorizedException()
    }

    return this.authService.logout(
      request.user.authSessionId,
      request.user.userId,
    )
  }

  @Post('devices')
  registerDevice(
    @Req() request: any,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.authService.registerDevice(
      request.user.userId,
      request.user.tenantId,
      dto.name,
    )
  }

  @Get('devices')
  listDevices(@Req() request: any) {
    return this.authService.listDevices(
      request.user.userId,
      request.user.tenantId,
    )
  }
}
