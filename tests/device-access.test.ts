import {afterEach,describe,expect,it,vi} from 'vitest';
import {readPosition,featureAllowed,cameraErrorMessage,stopCamera} from '../lib/device-access';
import {prepareImage,validateImageFile} from '../lib/image';

afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()});
function setupGeo(handler: (...args: any[])=>void, allowed=true) {
 vi.stubGlobal('window',{isSecureContext:true});
 vi.stubGlobal('document',{permissionsPolicy:{allowsFeature:()=>allowed}});
 const get=vi.fn(handler); vi.stubGlobal('navigator',{geolocation:{getCurrentPosition:get}});return get;
}
const point={coords:{latitude:10.77,longitude:106.69,accuracy:24},timestamp:12345};
describe('Vị trí: quyền, lỗi và yêu cầu đã hủy',()=>{
 it('giữ tọa độ và độ chính xác từ thiết bị',async()=>{const get=setupGeo(ok=>ok(point));await expect(readPosition()).resolves.toEqual({lat:10.77,lng:106.69,accuracy:24,timestamp:12345});expect(get.mock.calls[0][2].enableHighAccuracy).toBe(true)});
 it('không gọi thiết bị nếu khung không cho phép',async()=>{const get=setupGeo(()=>{},false);await expect(readPosition()).rejects.toThrow('tab riêng');expect(get).not.toHaveBeenCalled()});
 it('không gọi trên kết nối không an toàn',async()=>{const get=setupGeo(()=>{});vi.stubGlobal('window',{isSecureContext:false});await expect(readPosition()).rejects.toThrow('HTTPS');expect(get).not.toHaveBeenCalled()});
 it.each([[1,'quyền'],[2,'GPS'],[3,'quá lâu']])('phân biệt mã lỗi %s',async(code,message)=>{setupGeo((_ok,bad)=>bad({code}));await expect(readPosition()).rejects.toThrow(message)});
 it('từ chối tọa độ thiết bị không hợp lệ',async()=>{setupGeo(ok=>ok({...point,coords:{...point.coords,latitude:999}}));await expect(readPosition()).rejects.toThrow('chưa hợp lệ')});
 it('bỏ kết quả trễ sau khi người dùng hủy',async()=>{let success:(p:unknown)=>void=()=>{};setupGeo(ok=>{success=ok});const controller=new AbortController();const promise=readPosition(controller.signal);controller.abort();success(point);await expect(promise).rejects.toMatchObject({name:'AbortError'})});
 it('không để giao diện chờ vô hạn khi trình duyệt im lặng',async()=>{vi.useFakeTimers();setupGeo(()=>{});const p=readPosition();const check=expect(p).rejects.toThrow('quá lâu');await vi.advanceTimersByTimeAsync(18000);await check});
 it('hỗ trợ trình duyệt không cung cấp API policy',()=>{vi.stubGlobal('document',{});expect(featureAllowed('camera')).toBe(true)});
});
describe('Camera: thông báo và dừng thiết bị',()=>{
 it('hướng dẫn mở quyền thay vì giả vờ camera hoạt động',()=>{expect(cameraErrorMessage(new DOMException('denied','NotAllowedError'))).toContain('cấp quyền')});
 it('dừng tất cả track của camera',()=>{const first=vi.fn(),second=vi.fn();stopCamera({getTracks:()=>[{stop:first},{stop:second}]} as unknown as MediaStream);expect(first).toHaveBeenCalledOnce();expect(second).toHaveBeenCalledOnce();expect(()=>stopCamera(null)).not.toThrow()});
});
describe('Ảnh: kiểm tra tệp và chuẩn hóa cục bộ',()=>{
 it('chấp nhận JPEG cả khi thiết bị thiếu MIME',()=>{expect(()=>validateImageFile({name:'photo.JPG',size:100,type:''})).not.toThrow()});
 it('từ chối HEIC với chỉ dẫn đổi sang JPEG',()=>{expect(()=>validateImageFile({name:'photo.heic',size:100,type:'image/heic'})).toThrow('JPEG')});
 it('không tin đuôi ảnh khi MIME là loại khác',()=>{expect(()=>validateImageFile({name:'photo.jpg',size:100,type:'text/html'})).toThrow('Định dạng')});
 it.each([0,16*1024*1024])('từ chối tệp có kích thước %s',size=>{expect(()=>validateImageFile({name:'photo.png',size,type:'image/png'})).toThrow()});
 it('giảm kích thước, xuất JPEG và giải phóng bitmap sau xử lý',async()=>{
  const close=vi.fn();const draw=vi.fn();const canvas={width:0,height:0,getContext:()=>({drawImage:draw,fillRect:vi.fn(),fillStyle:''}),toDataURL:vi.fn(()=> 'data:image/jpeg;base64,YWJj')};
  vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:4000,height:3000,close})));
  vi.stubGlobal('document',{createElement:()=>canvas});
  const result=await prepareImage(new File(['photo'],'photo.jpg',{type:'image/jpeg'}));
  expect(result).toBe('YWJj');expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg',0.85);expect(canvas.width).toBe(672);expect(canvas.height).toBe(504);expect(draw).toHaveBeenCalledOnce();expect(close).toHaveBeenCalledOnce();
 });
 it('giải phóng bitmap nếu ảnh vượt giới hạn giải mã',async()=>{const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:10000,height:10000,close})));await expect(prepareImage(new File(['x'],'large.jpg',{type:'image/jpeg'}))).rejects.toThrow('48 triệu');expect(close).toHaveBeenCalledOnce()});
});
