import { Module } from '@nestjs/common';
import { SavedWorkersController } from './saved-workers.controller';
import { SavedWorkersService } from './saved-workers.service';

@Module({
  controllers: [SavedWorkersController],
  providers: [SavedWorkersService],
  exports: [SavedWorkersService],
})
export class SavedWorkersModule {}
