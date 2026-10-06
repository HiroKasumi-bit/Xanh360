import {afterEach, describe, expect, it, vi} from 'vitest';
import {api, ApiError} from '../lib/client';

afterEach(() => vi.unstubAllGlobals());
const serve = (response: Response) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

describe('Đọc phản hồi API an toàn', () => {
  it('nhận JSON và giữ nguyên bộ lọc điểm tiếp nhận', async () => {
    serve(Response.json({verified: [], confirm: []}));
    const query = {itemId: 'pin-aa', areaId: 'all', quantity: 1};
    await expect(api('/api/points', query)).resolves.toEqual({verified: [], confirm: []});
    expect(fetch).toHaveBeenCalledWith('/api/points', expect.objectContaining({
      method: 'POST', body: JSON.stringify(query), credentials: 'same-origin',
      redirect: 'manual', cache: 'no-store',
      headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
    }));
  });

  it('GET không thêm nội dung POST', async () => {
    serve(Response.json({items: []}));
    await api('/api/catalog');
    expect(fetch).toHaveBeenCalledWith('/api/catalog', expect.objectContaining({method: 'GET', body: undefined}));
  });

  it.each([200, 404, 502])('không hiện mã HTML hoặc Unexpected token khi máy chủ trả %s', async status => {
    serve(new Response('<!DOCTYPE html><html>Trang đăng nhập hoặc lỗi máy chủ</html>', {status, headers: {'Content-Type': 'text/html'}}));
    const error = await api('/api/points', {}).catch(error => error);
    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) throw new Error('Expected a user-facing API error');
    expect(error.message).not.toMatch(/Unexpected|DOCTYPE|<html>/);
    expect(error.message).toMatch(/thử lại/);
  });

  it('không lộ lỗi phân tích khi máy chủ ghi nhầm Content-Type JSON', async () => {
    serve(new Response('<html>error</html>', {headers: {'Content-Type': 'application/json'}}));
    await expect(api('/api/points', {})).rejects.toThrow('Chưa tải được dữ liệu hợp lệ');
  });

  it.each([new Response('', {headers: {'Content-Type': 'application/json'}}), Response.json(null)])('xử lý phản hồi trống', async response => {
    serve(response);
    await expect(api('/api/points', {})).rejects.toBeInstanceOf(ApiError);
  });

  it.each([401, 403])('chỉ dẫn kiểm tra quyền truy cập khi phản hồi HTML %s', async status => {
    serve(new Response('<html>Sign in</html>', {status, headers: {'Content-Type': 'text/html'}}));
    await expect(api('/api/points', {})).rejects.toMatchObject({kind: 'access', status});
  });

  it('nhận chuyển hướng đăng nhập trong trình duyệt mà không đọc HTML', async () => {
    const json = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({type: 'opaqueredirect', status: 0, json}));
    await expect(api('/api/points', {})).rejects.toMatchObject({kind: 'access'});
    expect(json).not.toHaveBeenCalled();
  });

  it('chặn chuyển hướng 302', async () => {
    serve(new Response(null, {status: 302, headers: {Location: '/signin-with-chatgpt'}}));
    await expect(api('/api/points', {})).rejects.toMatchObject({kind: 'access'});
  });

  it('giữ lại hướng dẫn hợp lệ từ API, kể cả khi AI chưa cấu hình', async () => {
    serve(Response.json({error: 'Nhận diện ảnh chưa được cấu hình.'}, {status: 503}));
    await expect(api('/api/recognize', {})).rejects.toThrow('Nhận diện ảnh chưa được cấu hình.');
  });

  it('đọc được kiểu JSON có hậu tố +json', async () => {
    serve(new Response('{"error":"Số lượng không hợp lệ."}', {status: 400, headers: {'Content-Type': 'application/problem+json; charset=utf-8'}}));
    await expect(api('/api/points', {})).rejects.toThrow('Số lượng không hợp lệ.');
  });

  it('lỗi mạng có thông báo dễ hiểu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/api/points', {})).rejects.toMatchObject({kind: 'network'});
  });

  it('giữ hủy yêu cầu khi người dùng đổi bộ lọc nhanh', async () => {
    const controller = new AbortController();
    const aborted = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(aborted));
    controller.abort();
    await expect(api('/api/points', {}, controller.signal)).rejects.toBe(aborted);
    expect(fetch).toHaveBeenCalledWith('/api/points', expect.objectContaining({signal: controller.signal}));
  });
});
