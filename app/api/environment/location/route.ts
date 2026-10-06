import {z} from 'zod';import {body,handle,json,rate,sameOrigin} from '@/lib/http';import {searchPlaces} from '@/lib/environment-provider';
export const POST=(req:Request)=>handle(async()=>{sameOrigin(req);const{query}=z.object({query:z.string().trim().min(2).max(100)}).parse(await body(req,2000));await rate(req,'environment-location',30);return json({places:await searchPlaces(query)})});
