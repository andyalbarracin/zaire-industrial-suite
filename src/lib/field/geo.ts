// geo.ts — src/lib/field/geo.ts — 2026-07-13
// Helpers de geolocalización para geocercas: distancia haversine y test de geocerca.

export interface LatLng {
  latitude: number | null;
  longitude: number | null;
}

export interface GeofenceSite extends LatLng {
  geofence_radius_m: number;
}

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distancia en metros entre dos puntos (fórmula de haversine).
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Devuelve true si el punto está dentro de la geocerca del sitio.
 * Si el sitio no tiene coordenadas, devuelve false.
 */
export function isInsideGeofence(point: LatLng, site: GeofenceSite): boolean {
  if (
    point.latitude == null ||
    point.longitude == null ||
    site.latitude == null ||
    site.longitude == null
  ) {
    return false;
  }
  const distance = haversineMeters(
    point.latitude,
    point.longitude,
    site.latitude,
    site.longitude
  );
  return distance <= site.geofence_radius_m;
}
