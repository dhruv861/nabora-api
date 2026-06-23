import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MAPS_PROVIDER, IMapsProvider } from './maps.interface';
import { GoogleMapsProvider } from './providers/google.maps.provider';
import { OpenStreetMapProvider } from './providers/openstreetmap.maps.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MAPS_PROVIDER,
      useFactory: (config: ConfigService): IMapsProvider => {
        const provider = config.get<string>('MAPS_PROVIDER', 'google');
        switch (provider) {
          case 'openstreetmap':
            return new OpenStreetMapProvider();
          case 'google':
          default:
            return new GoogleMapsProvider(config);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [MAPS_PROVIDER],
})
export class MapsModule {}
