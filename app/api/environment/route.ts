import {body,handle,json,rate,sameOrigin,HttpError} from '@/lib/http';
import {coordinates} from '@/lib/environment';
import {getEnvironment} from '@/lib/environment-provider';
export const POST=(req:Request)=>handle(async()=>{sameOrigin(req);const p=coordinates.parse(await body(req,2000));await rate(req,'environment',60);const result=await getEnvironment(p);if(!result.air&&!result.weather)throw new HttpError(503,'Nguồn thời tiết và không khí đang gián đoạn. Hãy thử lại sau.');return json(result)});
