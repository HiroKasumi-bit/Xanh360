import {z} from 'zod';
import type {Conditions,Coordinates} from './environment';
const schema=z.object({properties:z.object({timeseries:z.array(z.object({time:z.string().datetime(),data:z.object({instant:z.object({details:z.object({air_temperature:z.number(),relative_humidity:z.number().optional(),wind_speed:z.number().optional()})})})})).min(1)})});
type Forecast=z.infer<typeof schema>;
const cache=new Map<string,{expires:number;forecast:Forecast}>();
export function parseMetWeather(data:unknown,now=Date.now()):Conditions{
 const parsed=schema.parse(data);const closest=[...parsed.properties.timeseries].sort((a,b)=>Math.abs(Date.parse(a.time)-now)-Math.abs(Date.parse(b.time)-now))[0];
 if(Math.abs(Date.parse(closest.time)-now)>3600000)throw new Error('No current forecast');
 const d=closest.data.instant.details;
 return {source:'MET Norway',time:Date.parse(closest.time)/1000,values:{temperature_2m:d.air_temperature,relative_humidity_2m:d.relative_humidity??null,wind_speed_10m:d.wind_speed==null?null:d.wind_speed*3.6,apparent_temperature:null,precipitation:null,weather_code:null}};
}
export async function backupWeather(p:Coordinates):Promise<Conditions>{
 const key=`${p.lat},${p.lng}`;const old=cache.get(key);if(old&&old.expires>Date.now())return parseMetWeather(old.forecast);
 const url=new URL('https://api.met.no/weatherapi/locationforecast/2.0/compact');url.search=new URLSearchParams({lat:String(p.lat),lon:String(p.lng)}).toString();
 const response=await fetch(url,{headers:{'User-Agent':'Xanh360/1.0 https://xanh360.hangle-lienket.chatgpt.site'},signal:AbortSignal.timeout(12000),redirect:'follow'});
 if(!response.ok)throw new Error('MET Norway HTTP '+response.status);
 const forecast=schema.parse(await response.json());const expiry=Date.parse(response.headers.get('expires')??'');
 if(cache.size>=200)cache.delete(cache.keys().next().value!);cache.set(key,{forecast,expires:Math.max(Date.now()+600000,Number.isFinite(expiry)?expiry:0)});
 return parseMetWeather(forecast);
}
