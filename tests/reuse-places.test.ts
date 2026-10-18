import {describe, expect, it} from 'vitest';
import {placeMapsUrl, placeTypes, placesFor, reusePlaceSchema, reusePlaces} from '../lib/reuse-places';
import {seed} from '../lib/seed';

const now = new Date('2026-10-17T05:00:00Z');

describe('Điểm tái chế và quyên góp', () => {
  it('mọi mục hợp lệ, có nguồn HTTPS và chỉ trỏ tới vật dụng có trong danh mục', () => {
    for (const p of reusePlaces) {
      expect(reusePlaceSchema.safeParse(p).success, p.id).toBe(true);
      expect(p.itemIds.every(id => seed.items.some(i => i.id === id)), p.id).toBe(true);
    }
    expect(new Set(reusePlaces.map(p => p.id)).size).toBe(reusePlaces.length);
  });

  it('chỉ dùng các loại đã định nghĩa; hiện có thương hiệu, từ thiện, ve chai', () => {
    for (const p of reusePlaces) expect(placeTypes, p.id).toContain(p.type);
    expect(new Set(reusePlaces.map(p => p.type))).toEqual(new Set(['brand', 'charity', 'scrap']));
  });

  it('chỉ trong TP.HCM: địa chỉ cố định ghi TP.HCM', () => {
    for (const p of reusePlaces.filter(p => p.address)) expect(p.address, p.id).toMatch(/TP\.HCM/);
  });

  it('số điện thoại (nếu có) đúng dạng số Việt Nam; không có thì ghi rõ trong thẻ', () => {
    for (const p of reusePlaces.filter(p => p.phone)) expect(p.phone.replace(/\D/g, ''), p.id).toMatch(/^(0\d{9,10}|1[89]00\d{4,6})$/);
  });

  it('chai nhựa, sách có ứng dụng ve chai; xếp theo thứ tự loại', () => {
    expect(placesFor('chai-nhua', reusePlaces, now).map(g => g.type)).toEqual(['scrap']);
    expect(placesFor('sach', reusePlaces, now).map(g => g.type)).toEqual(['scrap']);
  });

  it('quần áo cũ có thương hiệu thu hồi và tổ chức quyên góp; đồ điện tử có thu gom tận nhà', () => {
    const groups = placesFor('quan-ao', reusePlaces, now);
    expect(groups.map(g => g.type)).toEqual(['brand', 'charity']);
    expect(groups.flatMap(g => g.places.map(p => p.id))).toEqual(['re-uniqlo', 'reshare', 'goodwill-vn']);
    expect(placesFor('laptop', reusePlaces, now).flatMap(g => g.places.map(p => p.id))).toEqual(['vntc-pickup', 'tgdd-thu-cu', 'cellphones-thu-cu']);
  });

  it('các mục địa chỉ, lịch hoặc tình trạng chưa rõ đã được bỏ ra', () => {
    for (const id of ['mrf-tan-my', 'doi-rac-binh-tan', 'bitis-pin', 'sach-trao-tay'])
      expect(reusePlaces.some(p => p.id === id), id).toBe(false);
  });

  it('chương trình hết hạn không còn hiện', () => {
    const ended = [{...reusePlaces[0], validTo: '2026-12-31'}];
    expect(placesFor('laptop', ended, now)).toHaveLength(1);
    expect(placesFor('laptop', ended, new Date('2027-01-02T05:00:00Z'))).toHaveLength(0);
  });

  it('vật nguy hại hoặc rác còn lại không được gợi ý quyên góp', () => {
    for (const id of ['nhiet-ke-thuy-ngan', 'kim-tiem', 'thuoc-het-han', 'khau-trang', 'hop-xop']) {
      expect(placesFor(id, reusePlaces, now), id).toHaveLength(0);
    }
  });

  it('link Google Maps dùng dạng search ?api=1&query=', () => {
    for (const p of reusePlaces.filter(p => p.mapsQuery)) {
      const u = new URL(placeMapsUrl(p));
      expect(u.origin + u.pathname).toBe('https://www.google.com/maps/search/');
      expect(u.searchParams.get('query')).toBe(p.mapsQuery);
    }
  });
});
