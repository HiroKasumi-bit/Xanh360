import { z } from 'zod';
import { itemSchema } from './domain';
import { THRESHOLD as NO_THRESHOLD, WINDOW_DAYS } from './votes';

// Collection points added by visitors. Someone standing at a place that takes things (a scrap buyer, a collection box)
// adds it from their phone's GPS; it is listed apart from the sourced points as "Do người dùng thêm · chưa kiểm chứng".
// Five other devices confirming it on site, on at least two different days, mark it "Cộng đồng xác nhận"; three saying
// it no longer takes things warn about it; three reports (no such place, a private home, spam) hide it.
// A device adds one point a day, and a device with more than three points marked wrong adds no more.
export const USER_THRESHOLD = 5;
export const USER_MIN_DAYS = 2;
export const REPORT_HIDE = 3;
export const CREATE_ACCURACY_M = 100;
export const DUPLICATE_M = 30;
export const DEVICE_DAILY_POINTS = 1;
export const BAN_AFTER_BAD = 3;
export const SITE_DAILY_POINTS = 200;

export const itemGroups = itemSchema.shape.group.options;
export type ItemGroup = (typeof itemGroups)[number];
export const groupLabels: Record<ItemGroup, string> = {
  plastic: 'Nhựa',
  paper: 'Giấy',
  metal: 'Kim loại',
  glass: 'Chai, lọ thủy tinh',
  organic: 'Thực phẩm & cây cỏ',
  electronic: 'Đồ điện, điện tử',
  chemical: 'Hóa chất & thủy ngân',
  battery: 'Pin',
  bulky: 'Đồ cồng kềnh',
  other: 'Đồ dùng & bao bì khác',
};

export const reportReasons = ['missing', 'private', 'spam'] as const;
export const reportLabels: Record<(typeof reportReasons)[number], string> = {
  missing: 'Không có điểm này ở đây',
  private: 'Nhà riêng hoặc thông tin cá nhân',
  spam: 'Quảng cáo hoặc nội dung xấu',
};

// One line of plain text: control characters become spaces, runs of spaces collapse.
export const plainText = (s: string) =>
  s
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// What a visitor may not put in a name, address or note: links (spam) and phone numbers (often someone's own).
export function textProblem(s: string): string | null {
  if (/https?:|www\.|\.(com|vn|net|org|info|xyz)\b/i.test(s)) return 'Không nhập đường link.';
  if (/(\d[\s.\-]?){9,}/.test(s)) return 'Không nhập số điện thoại.';
  return null;
}

const coords = {
  deviceId: z.string().uuid(),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(100000),
};

export const createSchema = z
  .object({
    action: z.literal('create'),
    name: z.string().max(400).transform(plainText).pipe(z.string().min(3).max(80)),
    address: z.string().max(800).transform(plainText).pipe(z.string().min(5).max(160)),
    note: z.string().max(1000).transform(plainText).pipe(z.string().max(200)).default(''),
    groups: z
      .array(z.enum(itemGroups))
      .min(1)
      .max(itemGroups.length)
      .transform((g) => [...new Set(g)]),
    ...coords,
  })
  .strict();
export type CreateInput = z.infer<typeof createSchema>;

export const userPointId = z.string().regex(/^u-[0-9a-f]{16}$/);

export const reportSchema = z
  .object({ action: z.literal('report'), id: userPointId, reason: z.enum(reportReasons), deviceId: z.string().uuid() })
  .strict();

export type UserVoteRow = { device_hash: string; vote: string; day: string; created_at: string };
export type UserPointSummary = {
  yes: number;
  no: number;
  reports: number;
  status: 'confirmed' | 'warning' | 'hidden' | 'pending';
  lastConfirmedAt: string | null;
};

// Each device counts once, by its latest vote in the window, and the device that added the point does not count.
// Hidden wins over everything (reports are about the listing itself), then "no longer takes things", as for sourced
// points; confirmation also needs the yes votes to fall on at least USER_MIN_DAYS different days.
export function summarizeUser(rows: UserVoteRow[], creatorHash: string, now = new Date()): UserPointSummary {
  const since = now.getTime() - WINDOW_DAYS * 86400000;
  const latest = new Map<string, UserVoteRow>();
  let lastConfirmedAt: string | null = null;
  for (const row of rows) {
    if (row.device_hash === creatorHash) continue;
    const at = Date.parse(row.created_at);
    if (!Number.isFinite(at) || at < since || at > now.getTime() + 60000) continue;
    const seen = latest.get(row.device_hash);
    if (!seen || Date.parse(seen.created_at) < at) latest.set(row.device_hash, row);
    if (row.vote === 'yes' && (!lastConfirmedAt || lastConfirmedAt < row.created_at)) lastConfirmedAt = row.created_at;
  }
  let yes = 0;
  let no = 0;
  let reports = 0;
  const yesDays = new Set<string>();
  for (const row of latest.values()) {
    if (row.vote === 'yes') {
      yes++;
      yesDays.add(row.day);
    } else if (row.vote === 'no') no++;
    else if (row.vote.startsWith('report')) reports++;
  }
  const status =
    reports >= REPORT_HIDE && reports >= yes
      ? 'hidden'
      : no >= NO_THRESHOLD && no >= yes
        ? 'warning'
        : yes >= USER_THRESHOLD && yesDays.size >= USER_MIN_DAYS
          ? 'confirmed'
          : 'pending';
  return { yes, no, reports, status, lastConfirmedAt };
}

export type UserPoint = {
  id: string;
  name: string;
  address: string;
  note: string;
  groups: ItemGroup[];
  latitude: number;
  longitude: number;
  createdAt: string;
  summary: UserPointSummary;
};

// Opens Google Maps at the point's own coordinates (no key needed), so a visitor can check the place and get there.
export function userPointMapsUrl(p: { latitude: number; longitude: number }) {
  const u = new URL('https://www.google.com/maps/search/');
  u.searchParams.set('api', '1');
  u.searchParams.set('query', `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`);
  return u.toString();
}
