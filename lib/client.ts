type ApiErrorKind = 'access' | 'network' | 'response' | 'request';

export class ApiError extends Error {
  constructor(message: string, public kind: ApiErrorKind, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function responseError(status: number): ApiError {
  if (status === 401 || status === 403) {
    return new ApiError('Chưa xác nhận được quyền truy cập. Hãy mở lại website và đăng nhập nếu được yêu cầu.', 'access', status);
  }
  if (status === 429) {
    return new ApiError('Bạn đã gửi nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại.', 'request', status);
  }
  if (status >= 500) {
    return new ApiError('Dịch vụ đang gián đoạn. Vui lòng thử lại sau ít phút.', 'response', status);
  }
  return new ApiError('Chưa tải được dữ liệu hợp lệ. Hãy thử lại hoặc mở Xanh360 ở tab riêng.', 'response', status);
}

export async function api<T>(path: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { Accept: 'application/json', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: data === undefined ? undefined : JSON.stringify(data),
      credentials: 'same-origin',
      cache: 'no-store',
      // API requests must not follow a sign-in/error page and read it as data.
      redirect: 'manual',
      signal,
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new ApiError('Không thể kết nối. Hãy kiểm tra mạng rồi thử lại.', 'network');
  }

  if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
    throw new ApiError('Yêu cầu dữ liệu đã chuyển sang trang khác. Hãy mở lại Xanh360 và đăng nhập nếu được yêu cầu.', 'access', response.status);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
  if (contentType !== 'application/json' && !(contentType.startsWith('application/') && contentType.endsWith('+json'))) {
    throw responseError(response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw responseError(response.status);
  }
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body ? body.error : undefined;
    if (typeof message === 'string' && message.trim()) {
      throw new ApiError(message, response.status === 401 || response.status === 403 ? 'access' : 'request', response.status);
    }
    throw responseError(response.status);
  }
  if (body === null || typeof body !== 'object') throw responseError(response.status);
  return body as T;
}
