import {describe, expect, it} from 'vitest';
import {findPoints, mapsPlace, pointSchema} from '../lib/domain';
import {seed} from '../lib/seed';

const now = new Date('2026-10-17T05:00:00Z');
const query = {itemId: 'pin-aa', areaId: 'all', quantity: 1, audience: 'household' as const, intact: true, radius: 0};

describe('Dữ liệu điểm tiếp nhận TP.HCM', () => {
  it('mọi điểm hợp lệ, trong TP.HCM, có nguồn và ngày kiểm tra', () => {
    for (const p of seed.points) {
      expect(pointSchema.safeParse(p).success, p.id).toBe(true);
      expect(seed.areas.some(a => a.id === p.areaId && a.cityId === 'hcm'), p.id).toBe(true);
      expect(seed.sources.some(s => s.id === p.scopeSourceId), p.id).toBe(true);
      expect(p.sourceUrl, p.id).toMatch(/^https:\/\//);
      expect(p.sourceCheckedAt, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('địa chỉ dùng tên đơn vị hành chính sau 01/07/2025, không còn quận/phường số', () => {
    for (const p of seed.points) {
      expect(p.address, p.id).not.toMatch(/Quận \d|Phường \d|TP\. Thủ Đức/);
      expect(p.address, p.id).toMatch(/TP\.HCM$/);
    }
  });

  it('cả 4 điểm có nguồn chính thức + tọa độ khớp nên đã xác nhận, kèm hotline', () => {
    const r = findPoints(seed, query, now);
    expect(r.verified.map(x => x.point.id).sort()).toEqual(['mega-an-phu', 'mega-binh-phu', 'nhieu-loc', 'phu-nhuan']);
    for (const x of r.verified) {
      expect(x.point.coordinateSource, x.point.id).toMatch(/^OpenStreetMap/);
      expect(x.point.phone).toBe('0933 882 205');
    }
    expect(r.confirm).toHaveLength(0);
  });

  it('link Maps tìm theo tên hoặc địa chỉ đầy đủ để Google hiện đúng thẻ địa điểm; không theo tên chương trình', () => {
    for (const p of seed.points) {
      const u = new URL(mapsPlace(p));
      expect(u.origin + u.pathname).toBe('https://www.google.com/maps/search/');
      expect(u.searchParams.get('api')).toBe('1');
      const q = u.searchParams.get('query')!;
      expect(q, p.id).not.toMatch(/VNTC|Việt Nam Tái Chế/);
      expect(q, p.id).toBe(p.mapsQuery);
      expect(q, p.id).toMatch(/Thành phố Hồ Chí Minh$/);
    }
    expect(new URL(mapsPlace(seed.points.find(p => p.id === 'nhieu-loc')!)).searchParams.get('query')).toBe(
      'UBND Phường Nhiêu Lộc, 82 Bà Huyện Thanh Quan, Thành phố Hồ Chí Minh',
    );
  });

  it('không có tên/địa chỉ tìm kiếm thì link Maps dùng tọa độ, rồi tới địa chỉ', () => {
    const p = {...seed.points[0], mapsQuery: undefined};
    expect(new URL(mapsPlace({...p, latitude: 10.8, longitude: 106.75})).searchParams.get('query')).toBe('10.8,106.75');
    expect(new URL(mapsPlace({...p, latitude: null, longitude: null})).searchParams.get('query')).toBe(p.address);
  });

  it('nguồn chính thức + tọa độ + đang hoạt động thì được xác nhận; thiếu một điều kiện thì không', () => {
    const make = (patch: Partial<(typeof seed.points)[number]>) => {
      const c = structuredClone(seed);
      c.points = [{...c.points[0], ...patch}];
      return findPoints(c, query, now);
    };
    const ok = {status: 'active' as const, latitude: 10.75, longitude: 106.63};
    expect(make(ok).verified).toHaveLength(1);
    expect(make({...ok, status: 'unconfirmed'}).verified).toHaveLength(0);
    expect(make({...ok, latitude: null, longitude: null}).verified).toHaveLength(0);
    expect(make({...ok, sourceUrl: undefined}).verified).toHaveLength(0);
    expect(make({...ok, sourceCheckedAt: '2025-01-01'}).verified).toHaveLength(0);
  });

  it('điểm Phú Nhuận theo danh sách hiện hành (145/9), không dùng địa chỉ cũ 22 Nguyễn Văn Trỗi', () => {
    const p = seed.points.find(x => x.id === 'phu-nhuan')!;
    expect(p.address).toMatch(/^145\/9 Nguyễn Văn Trỗi/);
    expect(p.note).toMatch(/22 Nguyễn Văn Trỗi/);
  });

  it('bản ghi điểm cũ trong D1 (không có trường mới) vẫn hợp lệ', () => {
    const legacy: Record<string, unknown> = {...seed.points[0]};
    for (const k of ['mapsQuery', 'sourceUrl', 'sourceCheckedAt', 'phoneSourceUrl', 'note']) delete legacy[k];
    expect(pointSchema.safeParse(legacy).success).toBe(true);
  });
});
