import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Coordinates, GeocodingResult, IMapsProvider } from '../maps.interface';

@Injectable()
export class GoogleMapsProvider implements IMapsProvider {
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(private config: ConfigService) {}

  async geocode(address: string): Promise<GeocodingResult> {
    const res = await axios.get(`${this.baseUrl}/geocode/json`, {
      params: { address, key: this.config.get<string>('GOOGLE_MAPS_API_KEY') },
    });
    return this.parseGeocodingResponse(res.data.results[0]);
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    const res = await axios.get(`${this.baseUrl}/geocode/json`, {
      params: {
        latlng: `${lat},${lng}`,
        key: this.config.get<string>('GOOGLE_MAPS_API_KEY'),
      },
    });
    return this.parseGeocodingResponse(res.data.results[0]);
  }

  async getDistance(origin: Coordinates, destination: Coordinates): Promise<number> {
    const res = await axios.get(`${this.baseUrl}/distancematrix/json`, {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        key: this.config.get<string>('GOOGLE_MAPS_API_KEY'),
      },
    });
    const meters: number = res.data.rows[0].elements[0].distance.value;
    return meters / 1000;
  }

  private parseGeocodingResponse(result: Record<string, unknown>): GeocodingResult {
    const components = result.address_components as Array<{
      types: string[];
      long_name: string;
    }>;
    const geometry = result.geometry as { location: { lat: number; lng: number } };
    const city =
      components.find((c) => c.types.includes('locality'))?.long_name ?? '';
    const area =
      components.find((c) => c.types.includes('sublocality'))?.long_name ?? '';
    return {
      lat: geometry.location.lat,
      lng: geometry.location.lng,
      city,
      citySlug: city.toLowerCase().replace(/\s+/g, '-'),
      area,
      formattedAddress: result.formatted_address as string,
    };
  }
}
