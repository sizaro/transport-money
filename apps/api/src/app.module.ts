import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AppController } from './app.controller.js'
import { AuthGuard } from './common/auth/auth.guard.js'
import { DatabaseModule } from './database/database.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { SessionsModule } from './modules/sessions/sessions.module.js'
import { MoneyModule } from './modules/money/money.module.js'

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    SessionsModule,
    MoneyModule,
  ],
  controllers: [
    AppController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
