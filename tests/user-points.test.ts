import {beforeEach, describe, expect, it, vi} from 'vitest';
vi.mock('../app/chatgpt-auth', () => ({getChatGPTUser: async () => null}));
import {sqlite} from './runtime';
import {GET, POST} from '../app/api/user-points/route';
import {hashDevice, vietnamDay} from '../lib/votes';
import {BAN_AFTER_BAD, USER_THRESHOLD, summarizeUser, textProblem} from '../lib/user-points';

// A spot in District 1 with no catalog point within 30 m.
const here = {lat: 10.7731, lng: 106.6983};
let ip = 0;
const post = (data: Record<string, unknown>) =>
  POST(
    new Request('https://app.test/api/user-points', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', origin: 'https://app.test', 'cf-connecting-ip': `198.51.100.${++ip % 250}`},
      body: JSON.stringify(data),
    }),
  );
const point = (over: Record<string, unknown> = {}) => ({
  action: 'create',
  name: 'Tiệm ve chai đầu hẻm',
  address: '12 Lê Thánh Tôn, Phường Sài Gòn',
  note: 'Mở buổi sáng',
  groups: ['paper', 'metal'],
  deviceId: crypto.randomUUID(),
  ...here,
  accuracy: 15,
  ...over,
});
const list = async (group = 'paper') =>
  ((await (await GET(new Request(`https://app.test/api/user-points?group=${group}`))).json()) as {
    points: {id: string; name: string; summary: {status: string; yes: number}}[];
  }).points;
// Puts a vote straight into the table, for votes on other days than today.
const putVote = async (id: string, vote: string, day: string, deviceId = crypto.randomUUID()) =>
  sqlite
    .prepare(
      "INSERT INTO point_votes (id,target_kind,target_id,device_hash,vote,day,created_at) VALUES (?,'user',?,?,?,?,?)",
    )
    .run(crypto.randomUUID(), id, await hashDevice(deviceId), vote, day, new Date(`${day}T05:00:00Z`).toISOString());
const daysAgo = (n: number) => vietnamDay(new Date(Date.now() - n * 86400000));

beforeEach(() => {
  for (const table of ['records', 'rate_limits', 'point_votes', 'user_points']) sqlite.exec(`DELETE FROM ${table}`);
});

describe('Thêm điểm', () => {
  it('lưu điểm từ GPS và hiện trong nhóm đã chọn, chưa kiểm chứng', async () => {
    const r = await post(point());
    expect(r.status).toBe(201);
    const {point: p} = (await r.json()) as {point: {id: string; summary: {status: string}}};
    expect(p.id).toMatch(/^u-[0-9a-f]{16}$/);
    expect(p.summary.status).toBe('pending');
    expect((await list('paper')).map(x => x.id)).toEqual([p.id]);
    expect(await list('battery')).toEqual([]);
    const row = sqlite.prepare('SELECT * FROM user_points').get() as Record<string, unknown>;
    expect(row.device_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(await list('paper'))).not.toContain(String(row.device_hash));
  });

  it('từ chối vị trí ngoài TP.HCM, GPS kém, số điện thoại và đường link', async () => {
    expect((await post(point({lat: 21.0285, lng: 105.8542}))).status).toBe(400);
    expect((await post(point({accuracy: 400}))).status).toBe(400);
    const phone = await post(point({name: 'Ve chai gọi 0909 123 456'}));
    expect(phone.status).toBe(400);
    expect(((await phone.json()) as {error: string}).error).toContain('số điện thoại');
    expect((await post(point({note: 'xem www.example.com'}))).status).toBe(400);
    expect((await post(point({groups: []}))).status).toBe(400);
  });

  it('mỗi thiết bị một điểm mỗi ngày', async () => {
    const deviceId = crypto.randomUUID();
    expect((await post(point({deviceId}))).status).toBe(201);
    const again = await post(point({deviceId, lat: here.lat + 0.01}));
    expect(again.status).toBe(429);
  });

  it('không thêm trùng một điểm trong bán kính 30 m', async () => {
    expect((await post(point())).status).toBe(201);
    const twin = await post(point({lat: here.lat + 0.0001}));
    expect(twin.status).toBe(409);
    expect(((await twin.json()) as {error: string}).error).toContain('Tiệm ve chai đầu hẻm');
  });

  it(`cấm thiết bị có hơn ${BAN_AFTER_BAD} điểm bị báo không nhận`, async () => {
    const deviceId = crypto.randomUUID();
    const hash = await hashDevice(deviceId);
    for (let i = 0; i <= BAN_AFTER_BAD; i++) {
      const id = `u-${String(i).padStart(16, '0')}`;
      sqlite
        .prepare(
          "INSERT INTO user_points (id,name,address,note,groups,latitude,longitude,accuracy,device_hash,day,created_at) VALUES (?,?,?,'','[\"paper\"]',?,?,10,?,?,?)",
        )
        .run(id, 'Điểm ' + i, 'Địa chỉ ' + i, 10.8 + i / 100, 106.7, hash, daysAgo(10 + i), new Date(Date.now() - (10 + i) * 86400000).toISOString());
      for (let n = 0; n < 3; n++) await putVote(id, 'no', daysAgo(2));
    }
    const r = await post(point({deviceId}));
    expect(r.status).toBe(403);
    expect(((await r.json()) as {error: string}).error).toContain('không thể thêm điểm mới');
  });
});

describe('Xác nhận và báo sai', () => {
  const create = async (deviceId = crypto.randomUUID()) =>
    ((await (await post(point({deviceId}))).json()) as {point: {id: string}}).point.id;
  const near = {lat: here.lat + 0.0008, lng: here.lng + 0.0003};

  it('người thêm điểm không tự xác nhận hay báo được', async () => {
    const deviceId = crypto.randomUUID();
    const id = await create(deviceId);
    expect((await post({action: 'vote', id, vote: 'yes', deviceId, ...near, accuracy: 20})).status).toBe(403);
    expect((await post({action: 'report', id, reason: 'spam', deviceId})).status).toBe(403);
  });

  it('chỉ xác nhận được khi đứng trong bán kính 200 m', async () => {
    const id = await create();
    const far = await post({action: 'vote', id, vote: 'yes', deviceId: crypto.randomUUID(), lat: 10.8, lng: 106.72, accuracy: 20});
    expect(far.status).toBe(403);
    const ok = await post({action: 'vote', id, vote: 'yes', deviceId: crypto.randomUUID(), ...near, accuracy: 20});
    expect(ok.status).toBe(201);
  });

  it(`${USER_THRESHOLD} người ở ít nhất 2 ngày khác nhau thì thành "Cộng đồng xác nhận"`, async () => {
    const id = await create();
    for (let n = 0; n < USER_THRESHOLD; n++) await putVote(id, 'yes', daysAgo(1));
    expect((await list())[0].summary.status).toBe('pending');
    await putVote(id, 'yes', daysAgo(3));
    expect((await list())[0].summary.status).toBe('confirmed');
  });

  it('3 báo cáo thì điểm bị ẩn khỏi danh sách', async () => {
    const id = await create();
    for (let n = 0; n < 3; n++)
      expect((await post({action: 'report', id, reason: 'missing', deviceId: crypto.randomUUID()})).status).toBe(201);
    expect(await list()).toEqual([]);
  });
});

describe('Quy tắc chữ và đếm phiếu', () => {
  it('nhận địa chỉ có số nhà, chặn số điện thoại', () => {
    expect(textProblem('145/9 Nguyễn Văn Trỗi, Phường Phú Nhuận')).toBeNull();
    expect(textProblem('Liên hệ 0901.234.567')).not.toBeNull();
  });

  it('bỏ qua phiếu của người thêm điểm khi đếm', () => {
    const rows = Array.from({length: 6}, (_, i) => ({
      device_hash: 'creator',
      vote: 'yes',
      day: `2026-10-0${i + 1}`,
      created_at: new Date().toISOString(),
    }));
    expect(summarizeUser(rows, 'creator').yes).toBe(0);
  });
});
