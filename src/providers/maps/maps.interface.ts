export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  city: string;
  citySlug: string;
  area: string;
  formattedAddress: string;
}

export interface IMapsProvider {
  /** Convert address string to coordinates */
  geocode(address: string): Promise<GeocodingResult>;

  /** Convert coordinates to address */
  reverseGeocode(lat: number, lng: number): Promise<GeocodingResult>;

  /** Calculate straight-line distance in km between two points */
  getDistance(origin: Coordinates, destination: Coordinates): Promise<number>;
}

export const MAPS_PROVIDER = 'MAPS_PROVIDER';
