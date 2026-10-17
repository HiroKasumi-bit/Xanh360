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

  it('có đủ 4 loại: nhà nước, thương hiệu, từ thiện, ve chai', () => {
    for (const type of placeTypes) expect(reusePlaces.some(p => p.type === type), type).toBe(true);
  });

  it('chỉ trong TP.HCM: địa chỉ cố định ghi TP.HCM', () => {
    for (const p of reusePlaces.filter(p => p.address)) expect(p.address, p.id).toMatch(/TP\.HCM/);
  });

  it('số điện thoại (nếu có) đúng dạng số Việt Nam; không có thì ghi rõ trong thẻ', () => {
    for (const p of reusePlaces.filter(p => p.phone)) expect(p.phone.replace(/\D/g, ''), p.id).toMatch(/^0\d{9,10}$/);
  });

  it('chai nhựa có cả điểm nhà nước và ứng dụng ve chai, xếp theo thứ tự loại', () => {
    const groups = placesFor('chai-nhua', reusePlaces, now);
    expect(groups.map(g => g.type)).toEqual(['state', 'scrap']);
    expect(groups[0].places.map(p => p.id)).toContain('mrf-tan-my');
  });

  it('quần áo cũ có thương hiệu thu hồi và tổ chức quyên góp', () => {
    const types = placesFor('quan-ao', reusePlaces, now).map(g => g.type);
    expect(types).toEqual(['brand', 'charity']);
  });

  it('pin và đồ điện tử có chương trình thu hồi', () => {
    expect(placesFor('pin-aa', reusePlaces, now).flatMap(g => g.places.map(p => p.id))).toContain('bitis-pin');
    expect(placesFor('laptop', reusePlaces, now).flatMap(g => g.places.map(p => p.id))).toContain('vntc-pickup');
  });

  it('chương trình hết hạn không còn hiện', () => {
    const later = new Date('2027-01-02T05:00:00Z');
    expect(placesFor('chai-nhua', reusePlaces, later).flatMap(g => g.places.map(p => p.id))).not.toContain('mrf-tan-my');
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
