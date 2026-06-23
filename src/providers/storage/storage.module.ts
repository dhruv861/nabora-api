import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER, IStorageProvider } from './storage.interface';
import { R2StorageProvider } from './providers/r2.storage.provider';
import { S3StorageProvider } from './providers/s3.storage.provider';
import { LocalStorageProvider } from './providers/local.storage.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (config: ConfigService): IStorageProvider => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'r2');
        switch (provider) {
          case 's3':
            return new S3StorageProvider(config);
          case 'local':
            return new LocalStorageProvider();
          case 'r2':
          default:
            return new R2StorageProvider(config);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
