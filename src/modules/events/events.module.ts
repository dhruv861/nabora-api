import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { HiringModule } from '../hiring/hiring.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [HiringModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
