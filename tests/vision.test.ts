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
const req=(data:unknown)=>new Request('https://app.test/api/recognize',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://app.test'},body:JSON.stringify(data)});
type RunArgs={messages:{role:string;content:string|{type:string;text?:string;image_url?:{url:string}}[]}[];response_format:{type:string}};
const run=vi.fn<(model:string,input:RunArgs)=>Promise<unknown>>();

beforeEach(()=>{sqlite.exec('DELETE FROM rate_limits');run.mockReset();env.AI={run}});
afterEach(()=>{delete env.AI;delete env.VISION_ENDPOINT;delete env.VISION_API_KEY;vi.unstubAllGlobals()});

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
  expect(await r.json()).toEqual({status:'ok',candidates:[{itemId:'pin-aa',label:'Pin tiểu'},{itemId:'chai-nhua',label:'Chai nhựa'}]});
  const [model,input]=run.mock.calls[0];
  expect(model).toBe(WORKERS_AI_MODEL);
  expect(input.response_format.type).toBe('json_schema');
  const user=input.messages.find(m=>m.role==='user')!.content as {type:string;text?:string;image_url?:{url:string}}[];
  expect(user.find(p=>p.type==='image_url')?.image_url?.url).toBe(`data:image/png;base64,${image}`);
  expect(user.find(p=>p.type==='text')?.text).toContain('pin-aa: Pin AA / AAA');
 });
 it('đọc được JSON trả về dạng chuỗi, kể cả trong code fence',async()=>{
  run.mockResolvedValue({response:'```json\n{"status":"ok","candidates":[{"itemId":"carton","label":"Thùng giấy"}]}\n```'});
  expect(await (await recognize(req({consent:true,image}))).json()).toEqual({status:'ok',candidates:[{itemId:'carton',label:'Thùng giấy'}]});
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
 it('Workers AI lỗi hoặc hết lượt miễn phí trả 502 có hướng dẫn tra cứu tên',async()=>{
  run.mockRejectedValue(new Error('4006: you have used up your daily free allocation'));
  const r=await recognize(req({consent:true,image}));
  expect(r.status).toBe(502);
  expect(((await r.json()) as {error:string}).error).toContain('tra cứu bằng tên');
 });
 it('không đồng ý gửi ảnh thì không gọi AI',async()=>{
  expect((await recognize(req({consent:false,image}))).status).toBe(400);
  expect(run).not.toHaveBeenCalled();
 });
 it('ảnh không phải PNG hợp lệ bị từ chối trước khi gọi AI',async()=>{
  expect((await recognize(req({consent:true,image:Buffer.from('not a png').toString('base64')}))).status).toBe(400);
  expect(run).not.toHaveBeenCalled();
 });
 it('adapter HTTPS riêng được ưu tiên khi đã cấu hình',async()=>{
  env.VISION_ENDPOINT='https://vision.example.invalid/recognize';env.VISION_API_KEY='test-key';
  const fetchMock=vi.fn(async()=>new Response(JSON.stringify({status:'ok',candidates:[{itemId:'giay',label:'Giấy'}]})));
  vi.stubGlobal('fetch',fetchMock);
  expect(await (await recognize(req({consent:true,image}))).json()).toEqual({status:'ok',candidates:[{itemId:'giay',label:'Giấy'}]});
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(run).not.toHaveBeenCalled();
 });
});
