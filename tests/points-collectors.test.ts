import {describe, expect, it} from 'vitest';
import {findPoints, mapsPlace, pointSchema} from '../lib/domain';
import {seed} from '../lib/seed';
import {collectorPoints, scrapShops, tanMyMrf} from '../lib/points-collectors';
import {reusePlaces} from '../lib/reuse-places';

const now = new Date('2026-10-17T05:00:00Z');
const query = (itemId: string) => ({itemId, areaId: 'all', quantity: 1, audience: 'household' as const, intact: true, radius: 0});
const ids = (r: ReturnType<typeof findPoints>) => [...r.verified, ...r.confirm].map(x => x.point.id);

describe('Điểm thu gom đồ điện tử và tái chế ngoài VNTC', () => {
  it('mọi điểm hợp lệ, trong TP.HCM, có nguồn, số điện thoại và tọa độ', () => {
    for (const p of collectorPoints) {
      expect(pointSchema.safeParse(p).success, p.id).toBe(true);
      expect(seed.areas.some(a => a.id === p.areaId && a.cityId === 'hcm'), p.id).toBe(true);
      expect(seed.sources.some(s => s.id === p.scopeSourceId), p.id).toBe(true);
      expect(p.phone.replace(/\D/g, ''), p.id).toMatch(/^0\d{9}$/);
      expect(p.latitude, p.id).not.toBeNull();
      expect(p.address, p.id).toMatch(/TP\.HCM$/);
      expect(p.address, p.id).not.toMatch(/Quận \d|Phường \d/);
    }
  });

  it('tiệm thu mua xác luôn "Chưa xác minh", ghi rõ không phải điểm tái chế chính thức', () => {
    expect(scrapShops.length).toBeGreaterThanOrEqual(10);
    for (const p of scrapShops) {
      expect(p.status, p.id).toBe('unconfirmed');
      expect(p.provider, p.id).toBe('scrap');
      expect(p.acceptance[0].condition, p.id).toMatch(/không phải điểm tái chế chính thức/);
      expect(p.acceptance[0].intactOnly, p.id).toBe(false);
      expect(p.sourceUrl, p.id).toMatch(/^https:\/\/www\.google\.com\/maps\/place\//);
    }
  });

  it('tra điện thoại: điểm VNTC đã xác minh đứng trước, tiệm thu mua xác ở nhóm chưa xác minh', () => {
    const r = findPoints(seed, query('dien-thoai'), now);
    expect(r.verified.every(x => x.point.provider === 'brand')).toBe(true);
    expect(r.confirm.length).toBeGreaterThanOrEqual(8);
    expect(r.confirm.every(x => x.point.provider === 'scrap' && !x.verified)).toBe(true);
  });

  it('tra laptop có tiệm thu xác laptop; tra pin thì không gợi ý tiệm thu mua xác', () => {
    expect(ids(findPoints(seed, query('laptop'), now))).toContain('xac-laptop-truong-chinh');
    expect(ids(findPoints(seed, query('pin-aa'), now)).some(id => id.startsWith('xac-'))).toBe(false);
  });

  it('có vị trí thì tiệm gần nhất lên đầu nhóm', () => {
    const near = findPoints(seed, {...query('dien-thoai'), position: {lat: 10.8331, lng: 106.6674}}, now);
    expect(near.confirm[0].point.id).toBe('xac-dt-quang-trung');
  });

  it('trạm MRF Tân Mỹ là chương trình nhà nước đã xác minh, nhận đồ tái chế, hết hạn sau 31/12/2026', () => {
    expect(tanMyMrf.provider).toBe('state');
    const r = findPoints(seed, query('chai-nhua'), now);
    expect(r.verified.map(x => x.point.id)).toContain('mrf-tan-my');
    expect(ids(findPoints(seed, query('chai-nhua'), new Date('2027-01-05T05:00:00Z')))).not.toContain('mrf-tan-my');
    expect(new URL(mapsPlace(tanMyMrf)).searchParams.get('query')).toMatch(/^Trạm phân loại rác \(MRF\) phường Tân Mỹ/);
  });

  it('dịch vụ không có địa chỉ cố định đều có nguồn đã đọc trực tiếp', () => {
    for (const p of reusePlaces) {
      expect(p.verified, p.id).toBe(true);
      expect(p.kind, p.id).not.toBe('fixed');
    }
  });
});
