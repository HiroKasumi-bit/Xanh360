import {catalog,config} from '@/lib/repository';import {handle,json} from '@/lib/http';
export const GET=()=>handle(async()=>{const c=await catalog();return json({...c,rules:c.rules.filter(r=>r.status==='published'),points:c.points.filter(p=>!p.demo),capabilities:{image:!!config('VISION_ENDPOINT')&&!!config('VISION_API_KEY'),geocoding:false}})});
