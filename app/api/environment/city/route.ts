import {handle,json} from '@/lib/http';
import {getEnvironment} from '@/lib/environment-provider';
import {cityPoints,type CityEnvironment} from '@/lib/city-environment';
let cached:{expires:number;data:CityEnvironment}|undefined;
let pending:Promise<CityEnvironment>|undefined;
export const GET=()=>handle(async()=>{
 if(cached&&cached.expires>Date.now())return json(cached.data);
 if(!pending)pending=Promise.all(cityPoints.map(async p=>({...await getEnvironment(p),id:p.id,name:p.name}))).then(points=>{const data={points};cached={data,expires:Date.now()+(points.every(p=>p.air&&p.weather)?600000:60000)};return data}).finally(()=>{pending=undefined});
 return json(await pending);
});
