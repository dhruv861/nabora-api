import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
