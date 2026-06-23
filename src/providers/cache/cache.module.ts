import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CACHE_PROVIDER, ICacheProvider } from './cache.interface';
import { RedisCacheProvider } from './providers/redis.cache.provider';
import { MemoryCacheProvider } from './providers/memory.cache.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CACHE_PROVIDER,
      useFactory: (config: ConfigService): ICacheProvider => {
        const provider = config.get<string>('CACHE_PROVIDER', 'redis');
        switch (provider) {
          case 'memory':
            return new MemoryCacheProvider();
          case 'redis':
          default:
            return new RedisCacheProvider(config);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [CACHE_PROVIDER],
})
export class CacheModule {}
