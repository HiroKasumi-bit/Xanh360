import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('../app/chatgpt-auth',()=>({getChatGPTUser:async()=>null}));
import {sqlite,env} from './runtime';
import {POST as recognize} from '../app/api/recognize/route';
import {GET as catalog} from '../app/api/catalog/route';
import {WORKERS_AI_MODEL} from '../lib/vision';

// A 1×1 RGB PNG: signature, IHDR, IDAT, IEND. sanitizePng checks structure and size, not CRCs or pixel data.
function chunk(type:string,data:number[]){const len=data.length;return [len>>>24,(len>>>16)&255,(len>>>8)&255,len&255,...[...type].map(c=>c.charCodeAt(0)),...data,0,0,0,0]}
const png=Uint8Array.from([137,80,78,71,13,10,26,10,...chunk('IHDR',[0,0,0,1,0,0,0,1,8,2,0,0,0]),...chunk('IDAT',[120,156,99,248,15,0,1,1,1,0]),...chunk('IEND',[])]);
const image=Buffer.from(png).toString('base64');
// A structurally valid 672×504 JPEG: SOI, APP0 (JFIF), APP1 (EXIF metadata, must be dropped), DQT, SOF0, DHT, SOS, data, EOI.
const seg=(marker:number,data:number[])=>[0xff,marker,(data.length+2)>>8,(data.length+2)&255,...data];
const jpegBytes=(w=672,h=504,extra:number[]=[])=>Uint8Array.from([0xff,0xd8,...seg(0xe0,[74,70,73,70,0,1,1,0,0,1,0,1,0,0]),...seg(0xe1,[69,120,105,102,0,0,77,77]),...seg(0xdb,[0,...Array(64).fill(1)]),...seg(0xc0,[8,h>>8,h&255,w>>8,w&255,1,1,0x11,0]),...seg(0xc4,[0,...Array(16).fill(0)]),...seg(0xda,[1,1,0,0,63,0]),0x12,0x34,...extra,0xff,0xd9]);
const req=(data:unknown)=>new Request('https://app.test/api/recognize',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://app.test'},body:JSON.stringify(data)});
type RunArgs={messages:{role:string;content:string|{type:string;text?:string;image_url?:{url:string}}[]}[];response_format:{type:string;json_schema:{properties:{candidates:{items:{properties:{itemId:{enum:string[]}}}}}}}};
const run=vi.fn<(model:string,input:RunArgs,options?:{signal?:AbortSignal})=>Promise<unknown>>();

beforeEach(()=>{sqlite.exec('DELETE FROM rate_limits');run.mockReset();env.AI={run}});
afterEach(()=>{delete env.AI;delete env.VISION_ENDPOINT;delete env.VISION_API_KEY;delete env.IMAGE_DAILY_LIMIT;sqlite.exec('DELETE FROM records');vi.unstubAllGlobals()});
const names=(r:{candidates:{itemId:string;label:string}[]})=>r.candidates.map(c=>c.itemId);

describe('Nhận diện ảnh qua Workers AI',()=>{
 it('catalog báo có nhận diện khi có Workers AI, không có thì báo tắt',async()=>{
  expect(((await (await catalog()).json()) as {capabilities:{image:boolean}}).capabilities.image).toBe(true);
  delete env.AI;
  expect(((await (await catalog()).json()) as {capabilities:{image:boolean}}).capabilities.image).toBe(false);
 });
 it('gửi ảnh và danh mục, chỉ giữ ID có trong danh mục, bỏ trùng',async()=>{
  run.mockResolvedValue({response:{status:'ok',candidates:[{itemId:'pin-aa',label:'Pin tiểu'},{itemId:'khong-co-that',label:'Vật bịa'},{itemId:'pin-aa',label:'Pin tiểu'},{itemId:'chai-nhua',label:'Chai nhựa'}]}});
  const r=await recognize(req({consent:true,image}));
  expect(r.status).toBe(200);
  const body=await r.json() as {status:string;candidates:{itemId:string;label:string}[]};
  expect(body.status).toBe('ok');
  expect(names(body)).toEqual(['pin-aa','chai-nhua']);
  // People see the catalog's name, not the model's wording.
  expect(body.candidates[0].label).toBe('Pin AA / AAA');
  const [model,input,options]=run.mock.calls[0];
  expect(model).toBe(WORKERS_AI_MODEL);
  expect(options?.signal).toBeInstanceOf(AbortSignal);
  expect(input.response_format.type).toBe('json_schema');
  expect(input.response_format.json_schema.properties.candidates.items.properties.itemId.enum).toContain('pin-aa');
  const user=input.messages.find(m=>m.role==='user')!.content as {type:string;text?:string;image_url?:{url:string}}[];
  expect(user.find(p=>p.type==='image_url')?.image_url?.url).toBe(`data:image/png;base64,${image}`);
  expect(user.find(p=>p.type==='text')?.text).toContain('pin-aa: Pin AA / AAA');
 });
 it('đọc được JSON trả về dạng chuỗi, kể cả trong code fence',async()=>{
  run.mockResolvedValue({response:'```json\n{"status":"ok","candidates":[{"itemId":"carton","label":"Thùng giấy"}]}\n```'});
  expect(names(await (await recognize(req({consent:true,image}))).json() as {candidates:{itemId:string;label:string}[]})).toEqual(['carton']);
 });
 it('ảnh mờ không trả gợi ý',async()=>{
  run.mockResolvedValue({response:{status:'blurry',candidates:[{itemId:'pin-aa',label:'Pin'}]}});
  expect(await (await recognize(req({consent:true,image}))).json()).toEqual({status:'blurry',candidates:[]});
 });
 it('đầu ra sai định dạng trả lỗi 502, không đoán',async()=>{
  run.mockResolvedValue({response:'Tôi nghĩ đây là cái pin'});
  const r=await recognize(req({consent:true,image}));
  expect(r.status).toBe(502);
  expect(await r.json()).toHaveProperty('error');
 });
 it('hết lượt miễn phí của Workers AI trả 429 và hẹn giờ mở lại',async()=>{
  run.mockRejectedValue(new Error('AiError: 4006: you have used up your daily free allocation of 10,000 neurons'));
  const r=await recognize(req({consent:true,image}));
  expect(r.status).toBe(429);
  expect(((await r.json()) as {error:string}).error).toContain('7 giờ sáng');
 });
 it('lỗi khác của Workers AI trả 502 có hướng dẫn tra cứu tên',async()=>{
  run.mockRejectedValue(new Error('JSON Mode couldn\'t be met'));
  const r=await recognize(req({consent:true,image}));
  expect(r.status).toBe(502);
  expect(((await r.json()) as {error:string}).error).toContain('tra cứu bằng tên');
 });
 it('nhãn dài hoặc quá nhiều gợi ý được cắt bớt, không làm hỏng cả kết quả',async()=>{
  const many=['pin-aa','chai-nhua','carton','giay','vo-trai-cay','dien-thoai','chai-thuy-tinh','pin-9v','pin-aa'].map(itemId=>({itemId,label:'x'.repeat(300)}));
  run.mockResolvedValue({response:{status:'ok',candidates:many}});
  const r=await recognize(req({consent:true,image}));
  expect(r.status).toBe(200);
  expect(names(await r.json() as {candidates:{itemId:string;label:string}[]}).length).toBeLessThanOrEqual(8);
 });
 it('giới hạn chung mỗi ngày giữ trong lượt miễn phí, không gọi AI khi đã hết',async()=>{
  env.IMAGE_DAILY_LIMIT='2';
  run.mockResolvedValue({response:{status:'empty',candidates:[]}});
  const ip=(n:number)=>{const r=req({consent:true,image});r.headers.set('cf-connecting-ip','203.0.113.'+n);return r};
  expect((await recognize(ip(1))).status).toBe(200);
  expect((await recognize(ip(2))).status).toBe(200);
  const third=await recognize(ip(3));
  expect(third.status).toBe(429);
  expect(run).toHaveBeenCalledTimes(2);
 });
 it('chỉ gửi vật dụng đang hoạt động trong danh mục cho AI',async()=>{
  const item=(await (await catalog()).json() as {items:{id:string;name:string;active:boolean}[]}).items.find(i=>i.id==='pin-aa')!;
  sqlite.prepare("INSERT INTO records (kind,id,payload,version,updated_at) VALUES ('items',?,?,1,?)").run(item.id,JSON.stringify({...item,active:false}),new Date().toISOString());
  run.mockResolvedValue({response:{status:'empty',candidates:[]}});
  await recognize(req({consent:true,image}));
  const user=run.mock.calls[0][1].messages.find(m=>m.role==='user')!.content as {type:string;text?:string}[];
  expect(user.find(p=>p.type==='text')?.text).not.toContain('pin-aa:');
 });
 it('không đồng ý gửi ảnh thì không gọi AI',async()=>{
  expect((await recognize(req({consent:false,image}))).status).toBe(400);
  expect(run).not.toHaveBeenCalled();
 });
 it('ảnh không phải PNG hợp lệ bị từ chối trước khi gọi AI',async()=>{
  expect((await recognize(req({consent:true,image:Buffer.from('not a png').toString('base64')}))).status).toBe(400);
  expect(run).not.toHaveBeenCalled();
 });
 it('nhận ảnh JPEG, bỏ EXIF trước khi gửi AI',async()=>{
  run.mockResolvedValue({response:{status:'empty',candidates:[]}});
  const jpeg=Buffer.from(jpegBytes()).toString('base64');
  expect((await recognize(req({consent:true,image:jpeg}))).status).toBe(200);
  const user=run.mock.calls[0][1].messages.find(m=>m.role==='user')!.content as {type:string;image_url?:{url:string}}[];
  const sent=user.find(p=>p.type==='image_url')!.image_url!.url;
  expect(sent.startsWith('data:image/jpeg;base64,')).toBe(true);
  const bytes=Buffer.from(sent.split(',')[1],'base64');
  expect(bytes.includes(Buffer.from('Exif'))).toBe(false);
  expect(bytes.includes(Buffer.from('JFIF'))).toBe(true);
 });
 it('từ chối JPEG quá lớn hoặc bị cắt cụt trước khi gọi AI',async()=>{
  expect((await recognize(req({consent:true,image:Buffer.from(jpegBytes(2000,1500)).toString('base64')}))).status).toBe(400);
  expect((await recognize(req({consent:true,image:Buffer.from(jpegBytes().slice(0,-2)).toString('base64')}))).status).toBe(400);
  expect(run).not.toHaveBeenCalled();
 });
 it('adapter HTTPS riêng được ưu tiên khi đã cấu hình',async()=>{
  env.VISION_ENDPOINT='https://vision.example.invalid/recognize';env.VISION_API_KEY='test-key';
  const fetchMock=vi.fn(async()=>new Response(JSON.stringify({status:'ok',candidates:[{itemId:'giay',label:'Giấy'}]})));
  vi.stubGlobal('fetch',fetchMock);
  expect(names(await (await recognize(req({consent:true,image}))).json() as {candidates:{itemId:string;label:string}[]})).toEqual(['giay']);
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(run).not.toHaveBeenCalled();
 });
});
