import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
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
import { RatingsModule } from './modules/ratings/ratings.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { EventsModule } from './modules/events/events.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, ProvidersModule,
    ScheduleModule.forRoot(),
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
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60000, limit: 100 },
    ]),
    // Sprint 1
    AuthModule, UsersModule, SkillsModule, UploadModule,
    // Sprint 2
    JobsModule, SitemapModule,
    // Sprint 3
    NotificationsModule, ApplicationsModule, HiringModule, SavedWorkersModule,
    // Sprint 4
    ChatModule,
    // Sprint 5
    RatingsModule, OrganizationsModule,
    // Sprint 6
    EventsModule,
    // Sprint 7
    AttendanceModule, InvoicesModule,
    // Sprint 8
    DisputesModule, AdminModule, HealthModule,
  ],
})
export class AppModule {}
