// Mirrors Android LocationProvider. Browser geolocation plus OpenStreetMap
// Nominatim for city names (Android uses the platform Geocoder).

export type Coordinates = { latitude: number; longitude: number };

let last: Coordinates | null = null;

export const location = {
  /** Last fix this session, reused by Discover so it doesn't wait for GPS each time. */
  get last(): Coordinates | null {
    return last;
  },

  /**
   * 'unavailable' means the browser won't share location at all here: plain
   * http (other than localhost) or no geolocation support. 'denied' means the
   * user blocked it; only the browser's site settings can undo that.
   */
  async permissionState(): Promise<'granted' | 'prompt' | 'denied' | 'unavailable'> {
    if (!window.isSecureContext || !('geolocation' in navigator)) return 'unavailable';
    try {
      return (await navigator.permissions.query({ name: 'geolocation' })).state;
    } catch {
      return 'prompt';
    }
  },

  async hasPermission(): Promise<boolean> {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state === 'granted';
    } catch {
      return false;
    }
  },

  /** Asks the browser for a city-level fix. Null if denied, unavailable or slow. */
  current(): Promise<Coordinates | null> {
    if (!('geolocation' in navigator)) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          last = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          resolve(last);
        },
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
      );
    });
  },

  async cityName(c: Coordinates): Promise<string | null> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${c.latitude}&lon=${c.longitude}`,
        { headers: { 'Accept-Language': navigator.language } },
      );
      const json = (await res.json()) as { address?: Record<string, string> };
      const a = json.address ?? {};
      const place = a.county ?? a.city ?? a.town ?? a.state_district ?? a.state;
      const name = [place, a.country].filter(Boolean).join(', ');
      return name || null;
    } catch {
      return null;
    }
  },

  /** Coordinates for a typed city name, used when location permission is denied. */
  async geocodeCity(name: string): Promise<Coordinates | null> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(name)}`);
      const list = (await res.json()) as { lat: string; lon: string }[];
      if (!list[0]) return null;
      last = { latitude: Number(list[0].lat), longitude: Number(list[0].lon) };
      return last;
    } catch {
      return null;
    }
  },
};
