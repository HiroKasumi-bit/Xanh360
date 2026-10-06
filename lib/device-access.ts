export type DevicePosition = {lat: number; lng: number; accuracy: number; timestamp: number};
type PolicyDocument = Document & {permissionsPolicy?: {allowsFeature: (feature: string) => boolean}; featurePolicy?: {allowsFeature: (feature: string) => boolean}};

export function featureAllowed(feature: 'camera' | 'geolocation'): boolean {
  const doc = document as PolicyDocument;
  const policy = doc.permissionsPolicy ?? doc.featurePolicy;
  try { return policy ? policy.allowsFeature(feature) : true; } catch { return true; }
}
export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera chưa được cấp quyền. Hãy mở cài đặt quyền của website, cho phép Camera rồi thử lại. Nếu đang xem trong khung nhúng, hãy mở website ở tab riêng.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Chưa tìm thấy camera phù hợp. Bạn có thể chọn ảnh có sẵn hoặc dùng camera của thiết bị bên dưới.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'Camera đang được ứng dụng khác sử dụng hoặc chưa sẵn sàng. Hãy đóng ứng dụng đó rồi thử lại.';
  return 'Chưa mở được camera. Hãy thử lại hoặc chọn ảnh từ thiết bị.';
}
export function positionErrorMessage(code: number): string {
  if (code === 1) return 'Chưa được cấp quyền vị trí. Hãy bật Vị trí trong cài đặt quyền của website và trên thiết bị, rồi thử lại.';
  if (code === 2) return 'Thiết bị chưa xác định được vị trí. Hãy kiểm tra GPS/kết nối hoặc chọn khu vực thủ công.';
  return 'Lấy vị trí quá lâu. Hãy thử lại ở nơi có tín hiệu tốt hơn hoặc chọn khu vực thủ công.';
}
export function readPosition(signal?: AbortSignal): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Đã hủy', 'AbortError')); return; }
    if (!window.isSecureContext) { reject(new Error('Định vị cần kết nối HTTPS. Hãy mở đường dẫn website chính thức.')); return; }
    if (!featureAllowed('geolocation')) { reject(new Error('Khung hiển thị hiện tại chưa cho phép định vị. Hãy mở website ở tab riêng rồi bấm lại nút vị trí.')); return; }
    if (!navigator.geolocation) { reject(new Error('Trình duyệt chưa hỗ trợ định vị. Bạn vẫn có thể chọn khu vực thủ công.')); return; }
    let done = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (value?: DevicePosition, error?: Error) => {
      if (done) return;
      done = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel);
      if (error) reject(error); else resolve(value!);
    };
    const cancel = () => finish(undefined, new DOMException('Đã hủy', 'AbortError'));
    signal?.addEventListener('abort', cancel, {once: true});
    timer = setTimeout(() => finish(undefined, new Error(positionErrorMessage(3))), 18000);
    try {
      navigator.geolocation.getCurrentPosition(p => {
        const {latitude: lat, longitude: lng, accuracy} = p.coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(accuracy) || accuracy < 0) {
          finish(undefined, new Error('Thiết bị trả về vị trí chưa hợp lệ. Hãy thử lại.')); return;
        }
        finish({lat, lng, accuracy, timestamp: p.timestamp});
      }, e => finish(undefined, new Error(positionErrorMessage(e.code))), {enableHighAccuracy: true, timeout: 15000, maximumAge: 30000});
    } catch { finish(undefined, new Error('Chưa thể truy cập vị trí. Hãy kiểm tra quyền hoặc chọn khu vực thủ công.')); }
  });
}
export function stopCamera(stream: MediaStream | null) { stream?.getTracks().forEach(track => track.stop()); }
