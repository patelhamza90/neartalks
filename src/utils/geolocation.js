// src/utils/geolocation.js

/**
 * Get user's geolocation. Tries GPS first, then IP-based fallback.
 * Always resolves with { latitude, longitude } — never null.
 */
export async function getGeolocation() {
  // Try browser GPS first
  const gps = await getBrowserLocation();
  if (gps) return gps;

  // Fallback: IP-based geolocation
  const ip = await getIPLocation();
  if (ip) return ip;

  // Last resort: default to a valid location (user should retry)
  return { latitude: 0.0, longitude: 0.0, isFallback: true };
}

function getBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
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
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}
