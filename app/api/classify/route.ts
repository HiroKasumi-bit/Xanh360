import {catalog} from '@/lib/repository';import {handle,json,body,sameOrigin} from '@/lib/http';import {classify,classifySchema} from '@/lib/domain';
export const POST=(req:Request)=>handle(async()=>{sameOrigin(req);const b=classifySchema.parse(await body(req));const c=await catalog();return json(classify(c,b.itemId,b.areaId,b.answers))});
