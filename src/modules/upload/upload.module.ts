import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(), // Store in memory, then send to storage provider
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB guard at Multer level too
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
