import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {EnvironmentData} from '../lib/environment';
import {LOCAL_CACHE_MS, clearLocalEnvironmentCache, loadLocalEnvironment, localKey, localReadings} from '../lib/local-environment';

const now = Date.parse('2026-10-17T05:00:00Z');
const at = (minutesAgo: number) => (now - minutesAgo * 60000) / 1000;
const sample = (time = at(10)): EnvironmentData => ({
  fetchedAt: now,
  weather: {source: 'Open-Meteo', time, values: {temperature_2m: 31.4, apparent_temperature: 35, weather_code: 2}},
  air: {time, values: {us_aqi: 68, pm2_5: 21.3, pm10: 32}},
  weatherError: false,
  airError: false,
});

describe('Thời tiết và không khí tại vị trí người dùng', () => {
  beforeEach(() => clearLocalEnvironmentCache());

  it('gửi tọa độ đã làm tròn khoảng 1 km, không gửi tọa độ gốc', async () => {
    const fetcher = vi.fn(async () => sample());
    await loadLocalEnvironment({lat: 10.776912, lng: 106.700981}, fetcher, {now});
    expect(fetcher).toHaveBeenCalledWith({lat: 10.78, lng: 106.7});
  });

  it('dùng lại kết quả trong 10 phút cho cùng ô tọa độ, hết hạn thì gọi lại', async () => {
    const fetcher = vi.fn(async () => sample());
    await loadLocalEnvironment({lat: 10.7769, lng: 106.7009}, fetcher, {now});
    await loadLocalEnvironment({lat: 10.7771, lng: 106.7012}, fetcher, {now: now + 60000});
    expect(fetcher).toHaveBeenCalledTimes(1);
    await loadLocalEnvironment({lat: 10.7769, lng: 106.7009}, fetcher, {now: now + LOCAL_CACHE_MS + 1});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('nút cập nhật bỏ qua cache phía trình duyệt', async () => {
    const fetcher = vi.fn(async () => sample());
    await loadLocalEnvironment({lat: 10.78, lng: 106.7}, fetcher, {now});
    await loadLocalEnvironment({lat: 10.78, lng: 106.7}, fetcher, {now, force: true});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('lỗi không được lưu vào cache', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(sample());
    await expect(loadLocalEnvironment({lat: 10.78, lng: 106.7}, fetcher, {now})).rejects.toThrow();
    await expect(loadLocalEnvironment({lat: 10.78, lng: 106.7}, fetcher, {now})).resolves.toBeTruthy();
  });

  it('ô khác nhau có khóa khác nhau', () => {
    expect(localKey({lat: 10.78, lng: 106.7})).not.toBe(localKey({lat: 10.85, lng: 106.77}));
  });

  it('đọc nhiệt độ, US AQI, PM2.5 và mức chữ', () => {
    const r = localReadings(sample(), now);
    expect(r).toMatchObject({temp: 31.4, aqi: 68, pm25: 21.3, level: {label: 'Trung bình'}});
  });

  it('bỏ số liệu quá 3 giờ thay vì hiện như số hiện tại', () => {
    const r = localReadings(sample(at(4 * 60)), now);
    expect(r).toMatchObject({temp: null, aqi: null, pm25: null, level: {label: 'Chưa có dữ liệu'}});
  });

  it('thiếu nguồn không khí vẫn hiện nhiệt độ', () => {
    const r = localReadings({...sample(), air: null, airError: true}, now);
    expect(r.temp).toBe(31.4);
    expect(r.aqi).toBeNull();
  });
});
