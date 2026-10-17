import {beforeEach, describe, expect, it, vi} from 'vitest';
vi.mock('../app/chatgpt-auth', () => ({getChatGPTUser: async () => null}));
import {sqlite} from './runtime';
import {GET, POST} from '../app/api/votes/route';
import {seed} from '../lib/seed';
import {THRESHOLD, inHcm, summarize, vietnamDay, voteSchema} from '../lib/votes';

// Bình Phú gets checked coordinates through a published D1 record, as an admin would add them.
const at = {lat: 10.7466, lng: 106.6332};
const near = {lat: 10.7475, lng: 106.6335}; // about 100 m away
const far = {lat: 10.7766, lng: 106.7009}; // about 8 km away
function placeBinhPhu() {
  const p = {...seed.points.find(x => x.id === 'mega-binh-phu')!, latitude: at.lat, longitude: at.lng};
  sqlite
    .prepare('INSERT INTO records (kind,id,payload,version,updated_at) VALUES (?,?,?,?,?)')
    .run('points', p.id, JSON.stringify(p), 1, new Date().toISOString());
}
let ip = 0;
const post = (data: Record<string, unknown>, headers: Record<string, string> = {}) =>
  POST(
    new Request('https://app.test/api/votes', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', origin: 'https://app.test', 'cf-connecting-ip': `203.0.113.${++ip % 250}`, ...headers},
      body: JSON.stringify(data),
    }),
  );
const vote = (over: Record<string, unknown> = {}) => ({
  kind: 'point',
  targetId: 'mega-binh-phu',
  vote: 'yes',
  deviceId: crypto.randomUUID(),
  ...near,
  accuracy: 20,
  ...over,
});
const status = async (id = 'mega-binh-phu') =>
  ((await (await GET(new Request(`https://app.test/api/votes?kind=point&ids=${id}`))).json()) as {
    summaries: Record<string, {yes: number; no: number; status: string; lastConfirmedAt: string | null}>;
  }).summaries[id];

beforeEach(() => {
  for (const table of ['records', 'rate_limits', 'point_votes']) sqlite.exec(`DELETE FROM ${table}`);
});

describe('Đếm phiếu', () => {
  const row = (device: string, v: string, daysAgo: number) => ({
    device_hash: device,
    vote: v,
    created_at: new Date(Date.parse('2026-10-17T05:00:00Z') - daysAgo * 86400000).toISOString(),
  });
  const now = new Date('2026-10-17T05:00:00Z');
  it('cần đủ 3 thiết bị khác nhau mới được xác nhận', () => {
    expect(summarize([row('a', 'yes', 1), row('a', 'yes', 2), row('b', 'yes', 1)], now).status).toBe('pending');
    expect(summarize([row('a', 'yes', 1), row('b', 'yes', 1), row('c', 'yes', 3)], now)).toMatchObject({
      yes: 3,
      status: 'confirmed',
      lastConfirmedAt: row('a', 'yes', 1).created_at,
    });
  });
  it('≥3 phiếu "không còn nhận" thì cảnh báo, kể cả khi hòa', () => {
    const rows = ['a', 'b', 'c'].flatMap(d => [row(d, 'no', 1), row(d + 'y', 'yes', 2)]);
    expect(summarize(rows, now).status).toBe('warning');
  });
  it('mỗi thiết bị chỉ tính phiếu mới nhất; phiếu quá 90 ngày bị bỏ', () => {
    const s = summarize([row('a', 'yes', 5), row('a', 'no', 1), row('b', 'yes', 120)], now);
    expect(s).toMatchObject({yes: 0, no: 1});
  });
  it('ngày tính theo giờ Việt Nam', () => {
    expect(vietnamDay(new Date('2026-10-17T16:59:00Z'))).toBe('2026-10-17');
    expect(vietnamDay(new Date('2026-10-17T17:01:00Z'))).toBe('2026-10-18');
  });
  it('vùng TP.HCM gồm cả Côn Đảo, Vũng Tàu, Thủ Dầu Một; loại Hà Nội', () => {
    for (const p of [{lat: 8.69, lng: 106.61}, {lat: 10.35, lng: 107.08}, {lat: 10.98, lng: 106.65}]) expect(inHcm(p)).toBe(true);
    expect(inHcm({lat: 21.03, lng: 105.85})).toBe(false);
  });
  it('từ chối dữ liệu lạ: tọa độ không phải số, id thiết bị sai định dạng, trường thừa', () => {
    expect(voteSchema.safeParse(vote({lat: 'x'})).success).toBe(false);
    expect(voteSchema.safeParse(vote({lat: Number.NaN})).success).toBe(false);
    expect(voteSchema.safeParse(vote({deviceId: '123'})).success).toBe(false);
    expect(voteSchema.safeParse({...vote(), extra: 1}).success).toBe(false);
  });
});

describe('API xác nhận cộng đồng', () => {
  it('ba thiết bị khác nhau trong 200 m → "Đã xác nhận bởi cộng đồng"', async () => {
    placeBinhPhu();
    for (let i = 0; i < THRESHOLD; i++) expect((await post(vote())).status).toBe(201);
    const s = await status();
    expect(s).toMatchObject({yes: 3, status: 'confirmed'});
    expect(s.lastConfirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('cùng thiết bị bấm lần hai trong ngày bị từ chối', async () => {
    placeBinhPhu();
    const deviceId = crypto.randomUUID();
    expect((await post(vote({deviceId}))).status).toBe(201);
    const again = await post(vote({deviceId, vote: 'no'}));
    expect(again.status).toBe(409);
    expect((await status()).yes).toBe(1);
  });

  it('ở xa hơn 200 m bị từ chối, không ghi phiếu', async () => {
    placeBinhPhu();
    const r = await post(vote(far));
    expect(r.status).toBe(403);
    expect(((await r.json()) as {error: string}).error).toMatch(/bán kính 200 m/);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM point_votes').get()).toEqual({n: 0});
  });

  it('server dùng tọa độ của điểm trong danh mục, bỏ qua tọa độ điểm do trình duyệt gửi', async () => {
    placeBinhPhu();
    expect((await post({...vote(far), pointLat: far.lat, pointLng: far.lng})).status).toBe(400);
  });

  it('vị trí kém chính xác hoặc ngoài TP.HCM bị từ chối', async () => {
    placeBinhPhu();
    expect((await post(vote({accuracy: 900}))).status).toBe(400);
    expect((await post(vote({lat: 21.03, lng: 105.85}))).status).toBe(400);
  });

  it('điểm chưa có tọa độ kiểm chứng chưa nhận xác nhận; điểm không tồn tại trả 404', async () => {
    expect((await post(vote({targetId: 'nhieu-loc'}))).status).toBe(409);
    expect((await post(vote({targetId: 'khong-ton-tai'}))).status).toBe(404);
  });

  it('rate limit theo IP: quá 20 lần/giờ bị chặn', async () => {
    placeBinhPhu();
    const headers = {'cf-connecting-ip': '198.51.100.7'};
    for (let i = 0; i < 20; i++) await post(vote(), headers);
    expect((await post(vote(), headers)).status).toBe(429);
  });

  it('từ chối yêu cầu từ website khác', async () => {
    placeBinhPhu();
    expect((await post(vote(), {origin: 'https://evil.test'})).status).toBe(403);
  });

  it('không lưu tọa độ hoặc id thiết bị gốc', async () => {
    placeBinhPhu();
    const deviceId = crypto.randomUUID();
    await post(vote({deviceId}));
    const row = sqlite.prepare('SELECT * FROM point_votes').get() as Record<string, string>;
    expect(Object.keys(row).sort()).toEqual(['created_at', 'day', 'device_hash', 'id', 'target_id', 'target_kind', 'vote']);
    expect(row.device_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(deviceId);
  });

  it('GET kiểm tra tham số và trả trạng thái chờ khi chưa có phiếu', async () => {
    expect((await GET(new Request('https://app.test/api/votes?kind=x&ids=a'))).status).toBe(400);
    expect(await status('nhieu-loc')).toMatchObject({yes: 0, no: 0, status: 'pending', lastConfirmedAt: null});
  });
});
