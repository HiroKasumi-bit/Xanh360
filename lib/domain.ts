import {z} from 'zod';
export const idSchema=z.string().min(1).max(90).regex(/^[a-zA-Z0-9_-]+$/);
const txt=z.string().trim().max(2000);
const url=z.string().url().refine(v=>v.startsWith('https://'),'Chỉ dùng URL HTTPS');
export const categories=['recycle','organic','special','residual','unknown'] as const;
export type Category=typeof categories[number];
export const labels:Record<Category,string>={recycle:'Có thể tái chế',organic:'Thực phẩm & hữu cơ',special:'Thu gom chuyên biệt',residual:'Rác còn lại',unknown:'Cần xác nhận thêm'};
export const itemSchema=z.object({id:idSchema,name:txt.min(2),aliases:z.array(txt).max(30),material:txt,group:z.enum(['plastic','paper','metal','glass','organic','battery','electronic','chemical','bulky','other']),questions:z.array(z.enum(['clean','empty','intact'])).max(3),special:z.boolean(),active:z.boolean().default(true)});
export type Item=z.infer<typeof itemSchema>;
export const sourceSchema=z.object({id:idSchema,name:txt.min(2),url,checkedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),scope:txt});
export type Source=z.infer<typeof sourceSchema>;
export const areaSchema=z.object({id:idSchema,name:txt.min(2),aliases:z.array(txt),cityId:z.literal('hcm'),sourceId:idSchema,validFrom:z.string(),validTo:z.string().nullable().default(null)});
export type Area=z.infer<typeof areaSchema>;
export const ruleSchema=z.object({id:idSchema,name:txt.min(2),itemIds:z.array(idSchema).max(100),group:txt,areaId:txt.default('all'),conditions:z.record(z.enum(['clean','empty','intact']),z.boolean()),category:z.enum(categories),where:txt.min(3),steps:z.array(txt).min(1).max(8),avoid:txt,sourceIds:z.array(idSchema).min(1),priority:z.number().int().min(0).max(1000),version:z.number().int().min(1),status:z.enum(['draft','published','retired']),validFrom:z.string(),validTo:z.string().nullable(),special:z.boolean(),hazard:z.boolean().optional()}).refine(r=>!r.hazard||(r.special&&r.category==='special'&&r.itemIds.length>0&&r.conditions.intact===false),'Hướng dẫn sự cố phải gắn vật dụng cụ thể, thu gom riêng và tình trạng không nguyên vẹn.');
export type Rule=z.infer<typeof ruleSchema>;
export const acceptanceSchema=z.object({itemIds:z.array(idSchema).min(1),status:z.enum(['accepted','rejected','unknown']),condition:txt,sourceId:idSchema,checkedAt:z.string(),validTo:z.string().nullable(),verification:z.enum(['published','direct','unverified']),audience:z.enum(['household','business','both']),maxQuantity:z.number().positive().nullable(),intactOnly:z.boolean()});
export const pointSchema=z.object({id:idSchema,name:txt.min(2),address:txt.min(3),originalAddress:txt,areaId:idSchema,scopeSourceId:idSchema,latitude:z.number().min(-90).max(90).nullable(),longitude:z.number().min(-180).max(180).nullable(),coordinateSource:txt,placeId:txt,phone:z.string().regex(/^[+0-9 ()-]*$/).max(30),website:url,kind:z.enum(['fixed','event','pickup']),serviceAreaIds:z.array(idSchema),status:z.enum(['active','unconfirmed','paused']),validTo:z.string().nullable(),hours:txt,fee:txt,acceptance:z.array(acceptanceSchema).max(100),demo:z.boolean().default(false)}).refine(p=>(p.latitude===null)===(p.longitude===null),'Cần đủ cả vĩ độ và kinh độ');
export type Point=z.infer<typeof pointSchema>;
export type Catalog={items:Item[];rules:Rule[];points:Point[];sources:Source[];areas:Area[]};
export type Answers=Partial<Record<'clean'|'empty'|'intact',boolean>>;
export const questionText={clean:'Vật này sạch, không dính thức ăn hoặc dầu mỡ?',empty:'Bao bì đã rỗng, không còn chất lỏng bên trong?',intact:'Vật còn nguyên vẹn, không vỡ, phồng hoặc rò rỉ?'};
export const classifySchema=z.object({itemId:idSchema,areaId:idSchema.default('all'),answers:z.object({clean:z.boolean().optional(),empty:z.boolean().optional(),intact:z.boolean().optional()}).strict().default({})});
export type Classification={status:'questions'|'result'|'unknown'|'hazard';item:Item|null;questions:(keyof Answers)[];rule:Rule|null;message:string;scope:string};
export function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,' ').trim()}
function distance(a:string,b:string){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let last=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const prev=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,last+(a[i-1]===b[j-1]?0:1));last=prev}}return row[b.length]}
export function searchItems(items:Item[],q:string){const n=normalize(q);if(!n)return items.filter(i=>i.active);return items.filter(i=>i.active).map(i=>{const names=[i.name,...i.aliases].map(normalize);const score=names[0]===n?0:names.slice(1).includes(n)?1:names.some(s=>s.includes(n))?2:n.length>=4&&names.some(s=>Math.abs(s.length-n.length)<=2&&distance(s,n)<=Math.min(2,Math.floor(n.length/4)))?3:99;return{i,score}}).filter(x=>x.score<99).sort((a,b)=>a.score-b.score||a.i.name.localeCompare(b.i.name,'vi')).map(x=>x.i)}
export function activeDate(from:string|null,to:string|null,now=new Date()){return(!from||Date.parse(from)<=now.getTime())&&(!to||Date.parse(to+'T23:59:59+07:00')>=now.getTime())}
export function classify(c:Catalog,itemId:string,areaId:string,answers:Answers,now=new Date()):Classification{
 const item=c.items.find(i=>i.id===itemId&&i.active)??null;const base={item,questions:[] as (keyof Answers)[],rule:null,scope:'Hướng dẫn chung, chưa có quy tắc thu gom riêng cho khu vực đã chọn.'};
 if(!item)return{...base,status:'unknown',message:'Chưa có dữ liệu cho vật này.'};
 const applicable=c.rules.filter(r=>r.status==='published'&&activeDate(r.validFrom,r.validTo,now)&&(r.itemIds.length?r.itemIds.includes(itemId):r.group===item.group)&&(r.areaId==='all'||r.areaId===areaId)&&Object.entries(r.conditions).every(([k,v])=>answers[k as keyof Answers]===v)&&(!item.special||r.special)&&r.sourceIds.length>0&&r.sourceIds.every(id=>c.sources.some(s=>s.id===id)));
 const score=(r:Rule)=>(r.areaId===areaId&&areaId!=='all'?100000:0)+r.priority*10+Object.keys(r.conditions).length;
 if(item.special&&answers.intact===false){
  const safety=applicable.filter(r=>r.hazard&&r.special&&r.category==='special'&&r.itemIds.includes(itemId)&&r.conditions.intact===false).sort((a,b)=>score(b)-score(a));
  if(safety[0]&&(!safety[1]||score(safety[0])!==score(safety[1])))return{...base,status:'hazard',rule:safety[0],message:safety[0].where};
  return{...base,status:'hazard',message:'Vật có dấu hiệu hư hỏng. Hãy liên hệ nhà sản xuất hoặc đơn vị xử lý chuyên trách để được hướng dẫn trước khi vận chuyển. Không tự tháo, đốt hoặc trộn với rác khác.'};
 }
 const missing=item.questions.filter(q=>answers[q]===undefined);if(missing.length)return{...base,status:'questions',questions:missing.slice(0,3),message:'Xác nhận một chút để phân loại phù hợp hơn.'};
 const rules=applicable.filter(r=>!r.hazard);
 rules.sort((a,b)=>score(b)-score(a));if(!rules.length)return{...base,status:'unknown',message:'Chưa có hướng dẫn đủ căn cứ cho tình trạng này. Hãy hỏi đơn vị thu gom tại nơi bạn sống.'};
 if(rules[1]&&score(rules[0])===score(rules[1]))return{...base,status:'unknown',message:'Có hướng dẫn chồng lấn cần được rà soát. Chưa đưa ra kết luận.'};
 return{...base,status:'result',rule:rules[0],message:'Đủ dữ kiện để áp dụng hướng dẫn',scope:rules[0].areaId==='all'?base.scope:'Hướng dẫn theo khu vực đã chọn.'};
}
export function rulesOverlap(a:Rule,b:Rule){return a.id!==b.id&&a.status==='published'&&b.status==='published'&&a.areaId===b.areaId&&a.priority===b.priority&&((a.itemIds.length&&b.itemIds.length)?a.itemIds.some(x=>b.itemIds.includes(x)):a.group===b.group)&&!Object.keys({...a.conditions,...b.conditions}).some(k=>a.conditions[k as keyof Answers]!==undefined&&b.conditions[k as keyof Answers]!==undefined&&a.conditions[k as keyof Answers]!==b.conditions[k as keyof Answers])&&(!a.validTo||!b.validFrom||a.validTo>=b.validFrom)&&(!b.validTo||!a.validFrom||b.validTo>=a.validFrom)}
export function haversine(a:{lat:number;lng:number},b:{lat:number;lng:number}){const rad=(n:number)=>n*Math.PI/180;const dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng);return 6371*2*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2))}
export function mapsDirection(p:Point){const u=new URL('https://www.google.com/maps/dir/');u.searchParams.set('api','1');u.searchParams.set('destination',p.latitude!==null&&p.longitude!==null?`${p.latitude},${p.longitude}`:`${p.name}, ${p.address}`);if(p.placeId)u.searchParams.set('destination_place_id',p.placeId);return u.toString()}
export function mapsSearch(item:string,area:string){const u=new URL('https://www.google.com/maps/search/');u.searchParams.set('api','1');u.searchParams.set('query',`điểm thu gom ${item} ${area} TP Hồ Chí Minh`);return u.toString()}
export type PointQuery={itemId:string;areaId:string;quantity:number;audience:'household'|'business';intact:boolean;radius:number;position?:{lat:number;lng:number}};
export function findPoints(c:Catalog,q:PointQuery,now=new Date()){
 const found=c.points.flatMap(p=>{if(p.demo||p.status==='paused'||!activeDate(null,p.validTo,now)||!c.areas.some(a=>a.id===p.areaId&&a.cityId==='hcm'&&activeDate(a.validFrom,a.validTo,now))||!c.sources.some(s=>s.id===p.scopeSourceId))return[];
 if(q.areaId!=='all'&&(p.kind==='pickup'?!p.serviceAreaIds.includes(q.areaId):p.areaId!==q.areaId))return[];
 if(p.kind==='pickup'&&q.areaId==='all')return[];
 const accept=p.acceptance.find(a=>a.itemIds.includes(q.itemId));if(!accept||accept.status!=='accepted'||!activeDate(null,accept.validTo,now)||(accept.audience!=='both'&&accept.audience!==q.audience)||(accept.maxQuantity!==null&&q.quantity>accept.maxQuantity)||(accept.intactOnly&&!q.intact)||!c.sources.some(s=>s.id===accept.sourceId))return[];
 const km=q.position&&p.latitude!==null&&p.longitude!==null&&p.kind!=='pickup'?haversine(q.position,{lat:p.latitude,lng:p.longitude}):null;
 if(km!==null&&q.radius>0&&km>q.radius)return[];
 const fresh=Date.parse(accept.checkedAt)<=now.getTime()&&(now.getTime()-Date.parse(accept.checkedAt))/86400000<=90;
 const verified=accept.verification==='direct'&&fresh&&p.status==='active';
 return[{point:p,acceptance:accept,km,verified,directions:p.kind==='pickup'?null:mapsDirection(p)}];});
 found.sort((a,b)=>Number(b.verified)-Number(a.verified)||(a.km??Infinity)-(b.km??Infinity)||a.point.name.localeCompare(b.point.name,'vi'));
 return{verified:found.filter(x=>x.verified).slice(0,5),confirm:found.filter(x=>!x.verified).slice(0,5)};
}
