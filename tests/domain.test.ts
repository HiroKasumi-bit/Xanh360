import {describe,it,expect} from 'vitest';
import {classify,findPoints,normalize,searchItems,mapsDirection,haversine,rulesOverlap,itemSchema,ruleSchema,pointSchema,areaSchema,sourceSchema} from '../lib/domain';import {seed} from '../lib/seed';import {sanitizePng} from '../lib/image';
const now=new Date('2026-10-04T12:00:00Z');const query={itemId:'pin-aa',areaId:'all',quantity:1,audience:'household' as const,intact:true,radius:0};
describe('Dữ liệu và phạm vi',()=>{
it('Có ít nhất 40 vật và 168 đơn vị hành chính',()=>{expect(seed.items.length).toBeGreaterThanOrEqual(40);expect(seed.areas.length).toBe(169);for(const [data,schema]of [[seed.items,itemSchema],[seed.rules,ruleSchema],[seed.points,pointSchema],[seed.areas,areaSchema],[seed.sources,sourceSchema]] as const)for(const row of data)expect(schema.safeParse(row).success).toBe(true)});
it('Không trùng mã khu vực',()=>expect(new Set(seed.areas.map(a=>a.id)).size).toBe(seed.areas.length));
it.each(['thu-dau-mot','vung-tau','con-dao','sai-gon'])('Bao phủ khu vực %s',id=>expect(seed.areas.some(a=>a.id===id)).toBe(true));
});
describe('Tra cứu và phân loại',()=>{
it('Chuẩn hóa tiếng Việt và đ',()=>expect(normalize('ĐIỆN THOẠI')).toBe('dien thoai'));
it('Tên không dấu, tên gọi khác và lỗi gõ',()=>{expect(searchItems(seed.items,'chai nhua')[0].id).toBe('chai-nhua');expect(searchItems(seed.items,'laptop')[0].id).toBe('laptop');expect(searchItems(seed.items,'laptoo')[0].id).toBe('laptop')});
it('Truy vấn pin cho nhiều lựa chọn',()=>expect(searchItems(seed.items,'pin').length).toBeGreaterThan(1));
it('Thiếu dữ kiện yêu cầu xác nhận',()=>expect(classify(seed,'chai-nhua','all',{},now).status).toBe('questions'));
it('Giấy sạch và bẩn có hướng dẫn khác',()=>{expect(classify(seed,'giay','all',{clean:true},now).rule?.category).toBe('recycle');expect(classify(seed,'giay','all',{clean:false},now).rule?.category).toBe('unknown')});
it('Không rõ vật thì chưa xác định',()=>expect(classify(seed,'missing','all',{},now).status).toBe('unknown'));
it('Pin hỏng không đi theo luồng thông thường',()=>expect(classify(seed,'pin-aa','all',{intact:false},now).status).toBe('hazard'));
it('Quy tắc địa phương ưu tiên',()=>{const c=structuredClone(seed);c.rules.push({...c.rules.find(r=>r.id==='paper-clean')!,id:'local',areaId:'sai-gon'});expect(classify(c,'giay','sai-gon',{clean:true},now).rule?.id).toBe('local')});
it('Không dùng quy tắc hết hạn',()=>{const c=structuredClone(seed);c.rules=c.rules.map(r=>({...r,validTo:'2025-01-01'}));expect(classify(c,'giay','all',{clean:true},now).status).toBe('unknown')});
it('Xung đột không được chọn ngẫu nhiên',()=>{const c=structuredClone(seed);const r=c.rules.find(r=>r.id==='paper-clean')!;c.rules.push({...r,id:'duplicate'});expect(classify(c,'giay','all',{clean:true},now).status).toBe('unknown');expect(rulesOverlap(r,{...r,id:'duplicate'})).toBe(true)});
it('Không có nguồn thì không áp dụng',()=>{const c=structuredClone(seed);c.sources=[];expect(classify(c,'giay','all',{clean:true},now).status).toBe('unknown')});
});
describe('Điểm tiếp nhận',()=>{
it('Nguồn website không phải xác nhận trực tiếp',()=>{const r=findPoints(seed,query,now);expect(r.verified.length).toBe(0);expect(r.confirm.length).toBeGreaterThan(0)});
it('Không gán khoảng cách khi thiếu tọa độ',()=>expect(findPoints(seed,{...query,position:{lat:10.8,lng:106.7}},now).confirm.every(p=>p.km===null)).toBe(true));
it('Không suy từ pin ra mọi loại rác',()=>expect(findPoints(seed,{...query,itemId:'kim-tiem'},now).confirm).toHaveLength(0));
it('Vật hỏng và doanh nghiệp không vượt điều kiện',()=>{expect(findPoints(seed,{...query,intact:false},now).confirm).toHaveLength(0);expect(findPoints(seed,{...query,audience:'business'},now).confirm).toHaveLength(0)});
it('Điểm ngoài địa bàn, tạm dừng, hết hạn, demo bị loại',()=>{for(const patch of [{areaId:'outside'},{status:'paused' as const},{validTo:'2025-01-01'},{demo:true}]){const c=structuredClone(seed);c.points=c.points.map(p=>({...p,...patch}));expect(findPoints(c,query,now).confirm).toHaveLength(0)}});
it('Giới hạn số lượng',()=>{const c=structuredClone(seed);c.points.forEach(p=>p.acceptance.forEach(a=>a.maxQuantity=2));expect(findPoints(c,{...query,quantity:3},now).confirm).toHaveLength(0)});
it('Loại từ chối và tiếp nhận hết hạn',()=>{const c=structuredClone(seed);c.points.forEach(p=>p.acceptance.forEach(a=>a.status='rejected'));expect(findPoints(c,query,now).confirm).toHaveLength(0)});
it('Điểm gần không nhận vẫn bị loại',()=>{const c=structuredClone(seed);c.points[0].latitude=10.8;c.points[0].longitude=106.7;c.points[0].acceptance[0].status='rejected';expect(findPoints(c,{...query,position:{lat:10.8,lng:106.7}},now).confirm.some(x=>x.point.id===c.points[0].id)).toBe(false)});
it('Dịch vụ đến lấy xét vùng phục vụ',()=>{const c=structuredClone(seed);c.points=[{...c.points[0],kind:'pickup',serviceAreaIds:['sai-gon']}];expect(findPoints(c,{...query,areaId:'sai-gon'},now).confirm).toHaveLength(1);expect(findPoints(c,{...query,areaId:'con-dao'},now).confirm).toHaveLength(0)});
it('Mở Google Maps đúng đích và API',()=>{const p=seed.points[0];const u=new URL(mapsDirection(p));expect(u.searchParams.get('api')).toBe('1');expect(u.searchParams.get('destination')).toContain(p.address)});
it('Đường chim bay hợp lý',()=>{expect(haversine({lat:0,lng:0},{lat:0,lng:1})).toBeCloseTo(111.2,0)});
});
describe('Ảnh',()=>{it('Chặn file giả',()=>expect(()=>sanitizePng(new Uint8Array(100))).toThrow());it('Chặn dung lượng quá lớn',()=>expect(()=>sanitizePng(new Uint8Array(7*1024*1024))).toThrow())});
