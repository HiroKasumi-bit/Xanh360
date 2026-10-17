import {z} from 'zod';
import {catalog, db} from '@/lib/repository';
import {handle, json, body, sameOrigin, rate, HttpError} from '@/lib/http';
import {idSchema} from '@/lib/domain';
import {
  DEVICE_DAILY_LIMIT,
  MAX_ACCURACY_M,
  VOTE_RADIUS_M,
  WINDOW_DAYS,
  distanceMeters,
  hashDevice,
  inHcm,
  summarize,
  targetCoordinates,
  targetExists,
  vietnamDay,
  voteKinds,
  voteSchema,
  type VoteKind,
  type VoteRow,
} from '@/lib/votes';

async function rowsFor(kind: VoteKind, ids: string[]) {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
  const marks = ids.map(() => '?').join(',');
  const r = await db()
    .prepare(
      `SELECT target_id,device_hash,vote,created_at FROM point_votes WHERE target_kind=? AND target_id IN (${marks}) AND created_at>=?`,
    )
    .bind(kind, ...ids, since)
    .all<VoteRow & {target_id: string}>();
  return r.results;
}

const query = z.object({kind: z.enum(voteKinds), ids: z.array(idSchema).min(1).max(30)});

// GET /api/votes?kind=point&ids=a,b → the community status of each point. Counts only, nothing about who voted.
export const GET = (req: Request) =>
  handle(async () => {
    const url = new URL(req.url);
    const q = query.parse({kind: url.searchParams.get('kind'), ids: (url.searchParams.get('ids') ?? '').split(',').filter(Boolean)});
    await rate(req, 'votes-read', 600);
    const rows = await rowsFor(q.kind, q.ids);
    return json({summaries: Object.fromEntries(q.ids.map(id => [id, summarize(rows.filter(r => r.target_id === id))]))});
  });

// POST /api/votes → one vote. Checks, in order: request shape, IP rate, position inside HCMC and precise enough, the
// point has checked coordinates, the visitor is within 200 m of them, the device's daily cap, one vote per device,
// point and day. The position is used for the check only and is not stored.
export const POST = (req: Request) =>
  handle(async () => {
    sameOrigin(req);
    const v = voteSchema.parse(await body(req, 2000));
    await rate(req, 'vote', 20);
    if (!inHcm(v)) throw new HttpError(400, 'Vị trí nằm ngoài TP.HCM nên không thể xác nhận điểm này.');
    if (v.accuracy > MAX_ACCURACY_M)
      throw new HttpError(
        400,
        `Vị trí chưa đủ chính xác (±${Math.round(v.accuracy)} m). Hãy bật GPS, ra chỗ thoáng và thử lại.`,
      );
    const c = await catalog();
    if (!targetExists(c, v.kind, v.targetId)) throw new HttpError(404, 'Không tìm thấy điểm này.');
    const at = targetCoordinates(c, v.kind, v.targetId);
    if (!at) throw new HttpError(409, 'Điểm này chưa có tọa độ kiểm chứng nên chưa nhận xác nhận tại chỗ.');
    const meters = distanceMeters(v, at);
    if (meters > VOTE_RADIUS_M)
      throw new HttpError(
        403,
        `Bạn đang cách điểm khoảng ${Math.round(meters).toLocaleString('vi-VN')} m. Chỉ xác nhận được khi ở trong bán kính ${VOTE_RADIUS_M} m.`,
      );
    const device = await hashDevice(v.deviceId);
    const day = vietnamDay();
    const today = await db()
      .prepare('SELECT COUNT(*) AS n FROM point_votes WHERE device_hash=? AND day=?')
      .bind(device, day)
      .first<{n: number}>();
    if ((today?.n ?? 0) >= DEVICE_DAILY_LIMIT)
      throw new HttpError(429, 'Thiết bị này đã gửi nhiều xác nhận hôm nay. Hẹn bạn ngày mai.');
    const inserted = await db()
      .prepare(
        'INSERT INTO point_votes (id,target_kind,target_id,device_hash,vote,day,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(target_kind,target_id,device_hash,day) DO NOTHING RETURNING id',
      )
      .bind(crypto.randomUUID(), v.kind, v.targetId, device, v.vote, day, new Date().toISOString())
      .first<{id: string}>();
    if (!inserted) throw new HttpError(409, 'Hôm nay thiết bị này đã xác nhận điểm này rồi. Cảm ơn bạn!');
    return json({summary: summarize(await rowsFor(v.kind, [v.targetId]))}, 201);
  });
