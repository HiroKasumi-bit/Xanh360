import {z} from 'zod';
import {catalog, db} from '@/lib/repository';
import {handle, json, body, sameOrigin, rate, dailyCap, HttpError} from '@/lib/http';
import {
  DEVICE_DAILY_LIMIT,
  MAX_ACCURACY_M,
  VOTE_RADIUS_M,
  WINDOW_DAYS,
  distanceMeters,
  hashDevice,
  inHcm,
  vietnamDay,
} from '@/lib/votes';
import {
  BAN_AFTER_BAD,
  CREATE_ACCURACY_M,
  DEVICE_DAILY_POINTS,
  DUPLICATE_M,
  SITE_DAILY_POINTS,
  createSchema,
  itemGroups,
  reportSchema,
  summarizeUser,
  textProblem,
  userPointId,
  type ItemGroup,
  type UserPoint,
  type UserVoteRow,
} from '@/lib/user-points';

type Row = {
  id: string;
  name: string;
  address: string;
  note: string;
  groups: string;
  latitude: number;
  longitude: number;
  device_hash: string;
  created_at: string;
};
const columns = 'id,name,address,note,groups,latitude,longitude,device_hash,created_at';

// Votes on user points live with the other community votes (point_votes, target_kind 'user'), a chunk of ids at a
// time so a query stays under D1's limit on bound parameters.
async function votesFor(ids: string[]) {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
  const rows: (UserVoteRow & {target_id: string})[] = [];
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    const r = await db()
      .prepare(
        `SELECT target_id,device_hash,vote,day,created_at FROM point_votes WHERE target_kind='user' AND target_id IN (${chunk.map(() => '?').join(',')}) AND created_at>=?`,
      )
      .bind(...chunk, since)
      .all<UserVoteRow & {target_id: string}>();
    rows.push(...r.results);
  }
  return rows;
}

// The public shape of a point: no device hash, nothing about who added or voted.
function present(row: Row, votes: (UserVoteRow & {target_id: string})[]): UserPoint {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    note: row.note,
    groups: JSON.parse(row.groups) as ItemGroup[],
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    summary: summarizeUser(
      votes.filter(v => v.target_id === row.id),
      row.device_hash,
    ),
  };
}

async function find(id: string) {
  return db().prepare(`SELECT ${columns} FROM user_points WHERE id=? AND status='active'`).bind(id).first<Row>();
}

const groupQuery = z.enum(itemGroups);

// GET /api/user-points?group=battery → the points added by visitors that take this group, newest first, without
// the hidden ones.
export const GET = (req: Request) =>
  handle(async () => {
    const group = groupQuery.parse(new URL(req.url).searchParams.get('group'));
    await rate(req, 'user-points-read', 600);
    const r = await db()
      .prepare(
        `SELECT ${columns} FROM user_points WHERE status='active' AND groups LIKE ? ORDER BY created_at DESC LIMIT 100`,
      )
      .bind(`%"${group}"%`)
      .all<Row>();
    const votes = await votesFor(r.results.map(p => p.id));
    const points = r.results.map(p => present(p, votes)).filter(p => p.summary.status !== 'hidden');
    return json({points});
  });

const action = z.object({action: z.enum(['create', 'vote', 'report'])}).passthrough();
const voteSchema = z
  .object({
    action: z.literal('vote'),
    id: userPointId,
    vote: z.enum(['yes', 'no']),
    deviceId: z.string().uuid(),
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    accuracy: z.number().finite().min(0).max(100000),
  })
  .strict();

const meters = (m: number) => Math.round(m).toLocaleString('vi-VN');

async function create(req: Request, raw: unknown) {
  await rate(req, 'user-point-add', 5);
  const v = createSchema.parse(raw);
  for (const [label, text] of [
    ['Tên điểm', v.name],
    ['Địa chỉ', v.address],
    ['Ghi chú', v.note],
  ] as const) {
    const problem = textProblem(text);
    if (problem) throw new HttpError(400, `${label}: ${problem}`);
  }
  if (!inHcm(v)) throw new HttpError(400, 'Vị trí nằm ngoài TP.HCM. Xanh360 chỉ nhận điểm trong TP.HCM.');
  if (v.accuracy > CREATE_ACCURACY_M)
    throw new HttpError(
      400,
      `Vị trí chưa đủ chính xác (±${meters(v.accuracy)} m). Hãy bật GPS, ra chỗ thoáng gần điểm và thử lại.`,
    );
  const device = await hashDevice(v.deviceId);

  // A device whose points the community keeps marking wrong adds no more.
  const own = await db().prepare(`SELECT ${columns} FROM user_points WHERE device_hash=?`).bind(device).all<Row>();
  const ownVotes = await votesFor(own.results.map(p => p.id));
  const bad = own.results.filter(p => ['warning', 'hidden'].includes(present(p, ownVotes).summary.status)).length;
  if (bad > BAN_AFTER_BAD)
    throw new HttpError(
      403,
      'Thiết bị này đã thêm nhiều điểm bị cộng đồng báo là không nhận hoặc sai, nên không thể thêm điểm mới.',
    );
  const day = vietnamDay();
  if (own.results.filter(p => p.created_at && vietnamDay(new Date(p.created_at)) === day).length >= DEVICE_DAILY_POINTS)
    throw new HttpError(429, 'Mỗi thiết bị chỉ thêm được 1 điểm mỗi ngày. Hẹn bạn ngày mai.');

  // The same place twice: a point within DUPLICATE_M already listed, by visitors or in the sourced catalog.
  const dLat = DUPLICATE_M / 111320;
  const dLng = DUPLICATE_M / (111320 * Math.cos((v.lat * Math.PI) / 180));
  const nearby = await db()
    .prepare(
      `SELECT ${columns} FROM user_points WHERE status='active' AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`,
    )
    .bind(v.lat - dLat, v.lat + dLat, v.lng - dLng, v.lng + dLng)
    .all<Row>();
  const twin = nearby.results.find(p => distanceMeters(v, {lat: p.latitude, lng: p.longitude}) <= DUPLICATE_M);
  if (twin)
    throw new HttpError(
      409,
      `Đã có điểm “${twin.name}” do người dùng thêm, cách đây khoảng ${meters(distanceMeters(v, {lat: twin.latitude, lng: twin.longitude}))} m. Hãy xác nhận điểm đó thay vì thêm mới.`,
    );
  const listed = (await catalog()).points.find(
    p =>
      !p.demo &&
      p.latitude !== null &&
      p.longitude !== null &&
      distanceMeters(v, {lat: p.latitude, lng: p.longitude}) <= DUPLICATE_M,
  );
  if (listed) throw new HttpError(409, `Điểm “${listed.name}” đã có trong danh sách điểm tiếp nhận, ngay gần đây.`);

  await dailyCap('user-points', SITE_DAILY_POINTS, 'Hôm nay Xanh360 đã nhận đủ số điểm mới. Mời bạn quay lại ngày mai.');
  const row: Row = {
    id:
      'u-' +
      Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join(''),
    name: v.name,
    address: v.address,
    note: v.note,
    groups: JSON.stringify(v.groups),
    latitude: Math.round(v.lat * 1e6) / 1e6,
    longitude: Math.round(v.lng * 1e6) / 1e6,
    device_hash: device,
    created_at: new Date().toISOString(),
  };
  await db()
    .prepare(
      'INSERT INTO user_points (id,name,address,note,groups,latitude,longitude,accuracy,device_hash,day,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    )
    .bind(
      row.id,
      row.name,
      row.address,
      row.note,
      row.groups,
      row.latitude,
      row.longitude,
      Math.round(v.accuracy),
      device,
      day,
      row.created_at,
    )
    .run();
  return json({point: present(row, [])}, 201);
}

// Writes one vote or report for today; a later one from the same device on the same day replaces it.
async function record(id: string, device: string, vote: string) {
  const today = await db()
    .prepare('SELECT COUNT(*) AS n FROM point_votes WHERE device_hash=? AND day=?')
    .bind(device, vietnamDay())
    .first<{n: number}>();
  if ((today?.n ?? 0) >= DEVICE_DAILY_LIMIT)
    throw new HttpError(429, 'Thiết bị này đã gửi nhiều xác nhận hôm nay. Hẹn bạn ngày mai.');
  return db()
    .prepare(
      "INSERT INTO point_votes (id,target_kind,target_id,device_hash,vote,day,created_at) VALUES (?,'user',?,?,?,?,?) ON CONFLICT(target_kind,target_id,device_hash,day) DO NOTHING RETURNING id",
    )
    .bind(crypto.randomUUID(), id, device, vote, vietnamDay(), new Date().toISOString())
    .first<{id: string}>();
}

async function vote(req: Request, raw: unknown) {
  const v = voteSchema.parse(raw);
  await rate(req, 'vote', 20);
  if (!inHcm(v)) throw new HttpError(400, 'Vị trí nằm ngoài TP.HCM nên không thể xác nhận điểm này.');
  if (v.accuracy > MAX_ACCURACY_M)
    throw new HttpError(
      400,
      `Vị trí chưa đủ chính xác (±${meters(v.accuracy)} m). Hãy bật GPS, ra chỗ thoáng và thử lại.`,
    );
  const point = await find(v.id);
  if (!point) throw new HttpError(404, 'Không tìm thấy điểm này.');
  const away = distanceMeters(v, {lat: point.latitude, lng: point.longitude});
  if (away > VOTE_RADIUS_M)
    throw new HttpError(
      403,
      `Bạn đang cách điểm khoảng ${meters(away)} m. Chỉ xác nhận được khi ở trong bán kính ${VOTE_RADIUS_M} m.`,
    );
  const device = await hashDevice(v.deviceId);
  if (device === point.device_hash)
    throw new HttpError(403, 'Bạn đã thêm điểm này nên không tự xác nhận được. Hãy nhờ người khác tới xác nhận.');
  if (!(await record(v.id, device, v.vote)))
    throw new HttpError(409, 'Hôm nay thiết bị này đã xác nhận điểm này rồi. Cảm ơn bạn!');
  return json({point: present(point, await votesFor([v.id]))}, 201);
}

async function report(req: Request, raw: unknown) {
  const v = reportSchema.parse(raw);
  await rate(req, 'user-point-report', 10);
  const point = await find(v.id);
  if (!point) throw new HttpError(404, 'Không tìm thấy điểm này.');
  const device = await hashDevice(v.deviceId);
  if (device === point.device_hash)
    throw new HttpError(403, 'Bạn đã thêm điểm này nên không báo được. Nếu thêm nhầm, hãy gửi góp ý ở cuối trang.');
  if (!(await record(v.id, device, 'report-' + v.reason)))
    throw new HttpError(409, 'Hôm nay thiết bị này đã gửi ý kiến về điểm này rồi. Cảm ơn bạn!');
  return json({point: present(point, await votesFor([v.id]))}, 201);
}

// POST /api/user-points with action "create" (add a point from the phone's GPS), "vote" (confirm on site) or
// "report" (no such place, a private home, spam). Positions are used for the checks; only a new point's own
// coordinates are stored.
export const POST = (req: Request) =>
  handle(async () => {
    sameOrigin(req);
    const raw = await body(req, 4000);
    const a = action.parse(raw).action;
    return a === 'create' ? create(req, raw) : a === 'vote' ? vote(req, raw) : report(req, raw);
  });
