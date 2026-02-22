// src/utils/geolocation.js

export async function getGeolocation() {
  const gps = await getBrowserLocation();
  if (gps) return gps;

  const ip = await getIPLocation();
  if (ip) return ip;

  return { latitude: 0.0, longitude: 0.0, isFallback: true };
}

function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}

async function getIPLocation() {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.latitude && data.longitude) {
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        isIPBased: true,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Haversine distance between two lat/lng points in km.
 * Returns distance rounded to 1 decimal place.
 * Returns null if any coordinate is invalid.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const φ1 = parseFloat(lat1);
  const λ1 = parseFloat(lon1);
  const φ2 = parseFloat(lat2);
  const λ2 = parseFloat(lon2);

  // Reject invalid coordinates
  if ([φ1, λ1, φ2, λ2].some((v) => isNaN(v) || v === null || v === undefined)) return null;

  const dφ = (φ2 - φ1) * (Math.PI / 180);
  const dλ = (λ2 - λ1) * (Math.PI / 180);

  const a =
    Math.sin(dφ / 2) * Math.sin(dφ / 2) +
    Math.cos(φ1 * (Math.PI / 180)) *
    Math.cos(φ2 * (Math.PI / 180)) *
    Math.sin(dλ / 2) * Math.sin(dλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;

  return Math.round(dist * 10) / 10;
}