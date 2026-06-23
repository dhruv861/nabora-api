import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Coordinates, GeocodingResult, IMapsProvider } from '../maps.interface';

/**
 * Free, no API key. Uses Nominatim API.
 * Rate limit: 1 req/sec — acceptable for server-side geocoding.
 * Distance uses Haversine formula (no API call needed).
 */
@Injectable()
export class OpenStreetMapProvider implements IMapsProvider {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';

  async geocode(address: string): Promise<GeocodingResult> {
    const res = await axios.get(`${this.baseUrl}/search`, {
      params: { q: address, format: 'json', addressdetails: 1, limit: 1 },
      headers: { 'User-Agent': 'Nabora/1.0 (nabora.in)' },
    });
    return this.parseNominatimResponse(res.data[0]);
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    const res = await axios.get(`${this.baseUrl}/reverse`, {
      params: { lat, lon: lng, format: 'json', addressdetails: 1 },
      headers: { 'User-Agent': 'Nabora/1.0 (nabora.in)' },
    });
    return this.parseNominatimResponse(res.data);
  }

  async getDistance(origin: Coordinates, destination: Coordinates): Promise<number> {
    // Haversine formula — no API call needed for straight-line distance
    const R = 6371;
    const dLat = this.toRad(destination.lat - origin.lat);
    const dLng = this.toRad(destination.lng - origin.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(origin.lat)) *
        Math.cos(this.toRad(destination.lat)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private parseNominatimResponse(result: Record<string, unknown>): GeocodingResult {
    const addr = result.address as Record<string, string>;
    const city = addr.city ?? addr.town ?? addr.village ?? '';
    const area = addr.suburb ?? addr.neighbourhood ?? '';
    return {
      lat: parseFloat(result.lat as string),
      lng: parseFloat(result.lon as string),
      city,
      citySlug: city.toLowerCase().replace(/\s+/g, '-'),
      area,
      formattedAddress: result.display_name as string,
    };
  }
}
