import { z } from 'zod';
import { haversine, idSchema, type Catalog } from './domain';
import { reusePlaces } from './reuse-places';

// Community confirmation of collection and donation points. Someone standing at a point (within VOTE_RADIUS_M, by
// their phone's GPS) says it still takes things or no longer does. Three different devices agreeing within
// WINDOW_DAYS mark it "Đã xác nhận bởi cộng đồng" (or warn that it no longer takes things). The server checks the
// position against the point's own coordinates from the catalog, never against coordinates the page sends.
export const VOTE_RADIUS_M = 200;
export const MAX_ACCURACY_M = 150;
export const WINDOW_DAYS = 90;
export const THRESHOLD = 3;
export const DEVICE_DAILY_LIMIT = 20;

export const voteKinds = ['point', 'place'] as const;
export type VoteKind = (typeof voteKinds)[number];

export const voteSchema = z
  .object({
    kind: z.enum(voteKinds),
    targetId: idSchema,
    vote: z.enum(['yes', 'no']),
    deviceId: z.string().uuid(),
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    accuracy: z.number().finite().min(0).max(100000),
  })
  .strict();
export type VoteInput = z.infer<typeof voteSchema>;

// A box around Ho Chi Minh City as merged on 1 July 2025 (former Bình Dương and Bà Rịa – Vũng Tàu included, Côn Đảo
// at its southern edge). It only rejects positions that are plainly elsewhere; the 200 m check does the real work.
export function inHcm(p: { lat: number; lng: number }) {
  return p.lat >= 8.5 && p.lat <= 11.6 && p.lng >= 106.2 && p.lng <= 107.7;
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return haversine(a, b) * 1000;
}

// The calendar day in Vietnam (UTC+7, no daylight saving), so "one vote a day" turns over at local midnight.
export function vietnamDay(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

export async function hashDevice(deviceId: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('xanh360-device:' + deviceId));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function targetCoordinates(catalog: Catalog, kind: VoteKind, id: string) {
  if (kind === 'point') {
    const p = catalog.points.find((x) => x.id === id && !x.demo && x.status !== 'paused');
    return p && p.latitude !== null && p.longitude !== null ? { lat: p.latitude, lng: p.longitude } : null;
  }
  const place = reusePlaces.find((x) => x.id === id && x.kind === 'fixed');
  return place && place.latitude != null && place.longitude != null
    ? { lat: place.latitude, lng: place.longitude }
    : null;
}

export function targetExists(catalog: Catalog, kind: VoteKind, id: string) {
  return kind === 'point' ? catalog.points.some((x) => x.id === id && !x.demo) : reusePlaces.some((x) => x.id === id);
}

export type VoteRow = { device_hash: string; vote: string; created_at: string };
export type VoteSummary = {
  yes: number;
  no: number;
  status: 'confirmed' | 'warning' | 'pending';
  lastConfirmedAt: string | null;
};

// Each device counts once, by its latest vote in the window. "No longer takes things" wins a tie, since sending
// someone to a closed point costs more than an extra phone call.
export function summarize(rows: VoteRow[], now = new Date()): VoteSummary {
  const since = now.getTime() - WINDOW_DAYS * 86400000;
  const latest = new Map<string, VoteRow>();
  let lastConfirmedAt: string | null = null;
  for (const row of rows) {
    const at = Date.parse(row.created_at);
    if (!Number.isFinite(at) || at < since || at > now.getTime() + 60000) continue;
    const seen = latest.get(row.device_hash);
    if (!seen || Date.parse(seen.created_at) < at) latest.set(row.device_hash, row);
    if (row.vote === 'yes' && (!lastConfirmedAt || lastConfirmedAt < row.created_at)) lastConfirmedAt = row.created_at;
  }
  let yes = 0;
  let no = 0;
  for (const row of latest.values()) {
    if (row.vote === 'yes') yes++;
    else if (row.vote === 'no') no++;
  }
  const status = no >= THRESHOLD && no >= yes ? 'warning' : yes >= THRESHOLD ? 'confirmed' : 'pending';
  return { yes, no, status, lastConfirmedAt };
}
