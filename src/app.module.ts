import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { ProvidersModule } from './providers/providers.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SkillsModule } from './modules/skills/skills.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    // ─── Config (global) ──────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ─── Prisma (global) ──────────────────────────────────────────────────────
    PrismaModule,

    // ─── Provider Abstraction Layer (global) ──────────────────────────────────
    // All 7 providers (SMS, Storage, Maps, Cache, PDF, Email, Payment)
    // Each switchable via a single env variable
    ProvidersModule,

    // ─── Rate Limiting (general API — OTP-specific uses CacheProvider) ────────
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },   // 10 req/sec
      { name: 'medium', ttl: 60000, limit: 100 },   // 100 req/min
    ]),

    // ─── Feature Modules (Sprint 1) ──────────────────────────────────────────
    AuthModule,
    UsersModule,
    SkillsModule,
    UploadModule,
  ],
})
export class AppModule {}
