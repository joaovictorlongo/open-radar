import { Injectable } from '@angular/core';
import { enableLocationRequest, getCurrentLocation } from '@nativescript/geolocation';

export interface GeoLocation {
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private requesting = false;

  async requestCurrentLocation(): Promise<GeoLocation | null> {
    if (this.requesting) return null;
    this.requesting = true;

    try {
      await enableLocationRequest(false, false);
      const loc = await getCurrentLocation({ timeout: 15000, maximumAge: 120000 });
      return { lat: loc.latitude, lng: loc.longitude };
    } catch {
      return null;
    } finally {
      this.requesting = false;
    }
  }
}
