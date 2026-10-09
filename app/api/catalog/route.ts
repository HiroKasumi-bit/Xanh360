import {catalog} from '@/lib/repository';import {visionAvailable} from '@/lib/vision';import {handle,json} from '@/lib/http';
export const GET=()=>handle(async()=>{const c=await catalog();return json({...c,rules:c.rules.filter(r=>r.status==='published'),points:c.points.filter(p=>!p.demo),capabilities:{image:visionAvailable(),geocoding:false}})});
