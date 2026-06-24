import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { ProvidersModule } from './providers/providers.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SkillsModule } from './modules/skills/skills.module';
import { UploadModule } from './modules/upload/upload.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { SitemapModule } from './modules/sitemap/sitemap.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { HiringModule } from './modules/hiring/hiring.module';
import { SavedWorkersModule } from './modules/saved-workers/saved-workers.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    // ─── Config (global) ──────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ─── Prisma (global) ──────────────────────────────────────────────────────
    PrismaModule,

    // ─── Provider Abstraction Layer (global) ──────────────────────────────────
    ProvidersModule,

    // ─── Bull Queue (Redis-backed, global) ────────────────────────────────────
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    // ─── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },
      { name: 'medium', ttl: 60000, limit: 100 },
    ]),

    // ─── Feature Modules (Sprint 1) ───────────────────────────────────────────
    AuthModule,
    UsersModule,
    SkillsModule,
    UploadModule,

    // ─── Feature Modules (Sprint 2) ───────────────────────────────────────────
    JobsModule,
    SitemapModule,

    // ─── Feature Modules (Sprint 3) ───────────────────────────────────────────
    NotificationsModule,
    ApplicationsModule,
    HiringModule,
    SavedWorkersModule,

    // ─── Feature Modules (Sprint 4) ───────────────────────────────────────────
    ChatModule,
  ],
})
export class AppModule {}
