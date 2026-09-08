import { Test, TestingModule } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'
import { AppController } from './app.controller.js'
import { PrismaService } from './database/prisma.service.js'

describe('AppController', () => {
  it('should return the API health status', async () => {
    const prismaMock = {
      $queryRaw: async () => [{ '?column?': 1 }],
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile()

    const controller = module.get<AppController>(AppController)

    const result = await controller.health()

    expect(result.status).toBe('ok')
    expect(result.service).toBe('transport-money-api')
    expect(result.database).toBe('ok')
    expect(result.responseTimeMs).toEqual(expect.any(Number))
  })
})