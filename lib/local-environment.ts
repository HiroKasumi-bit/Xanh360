import {type Coordinates, type EnvironmentData, aqiLevel, coarsePosition, isStale} from './environment';

// Conditions at the visitor's own position, for the header chip. The server already rounds the position to about 1 km
// and caches each cell for 10 minutes; the page keeps its own copy for the same time, so moving the tab back and forth
// or reopening the location dialog never asks again within that window.
export const LOCAL_CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, {expires: number; data: EnvironmentData}>();

export function localKey(p: Coordinates) {
  const c = coarsePosition(p);
  return `${c.lat},${c.lng}`;
}

export async function loadLocalEnvironment(
  p: Coordinates,
  fetcher: (p: Coordinates) => Promise<EnvironmentData>,
  {force = false, now = Date.now()} = {},
) {
  const key = localKey(p);
  const hit = cache.get(key);
  if (!force && hit && hit.expires > now) return hit.data;
  const data = await fetcher(coarsePosition(p));
  if (cache.size >= 20) cache.delete(cache.keys().next().value!);
  cache.set(key, {expires: now + LOCAL_CACHE_MS, data});
  return data;
}

export function clearLocalEnvironmentCache() {
  cache.clear();
}

// Values older than 3 hours (or from the future) are left out rather than shown as current.
export function localReadings(data: EnvironmentData | null | undefined, now = Date.now()) {
  const weather = data?.weather && !isStale(data.weather.time, now) ? data.weather : null;
  const air = data?.air && !isStale(data.air.time, now) ? data.air : null;
  const aqi = air?.values.us_aqi ?? null;
  return {
    temp: weather?.values.temperature_2m ?? null,
    aqi,
    pm25: air?.values.pm2_5 ?? null,
    level: aqiLevel(aqi),
    weather,
    air,
  };
}
