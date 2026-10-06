import {type Coordinates,type EnvironmentData,type Place,coarsePosition,parseConditions,weatherFields,airFields} from './environment';
import {z} from 'zod';
import {backupWeather} from './weather-backup';
const cache=new Map<string,{expires:number;data:EnvironmentData}>();
const blockedUntil=new Map<string,number>();
async function read(url:URL){
 if((blockedUntil.get(url.hostname)??0)>Date.now())throw new Error('Provider cooldown');
 const response=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'manual'});
 if(response.status===429){const retry=response.headers.get('retry-after');const seconds=Number(retry);const until=retry&&Number.isFinite(seconds)?Date.now()+seconds*1000:Date.parse(retry??'');blockedUntil.set(url.hostname,Math.max(Date.now()+3600000,Number.isFinite(until)?until:0));}
 if(!response.ok)throw new Error('Provider HTTP '+response.status);return response.json();
}
export async function getEnvironment(input:Coordinates):Promise<EnvironmentData>{
 const p=coarsePosition(input);const key=`${p.lat},${p.lng}`;const cached=cache.get(key);if(cached&&cached.expires>Date.now())return cached.data;
 const params={latitude:String(p.lat),longitude:String(p.lng),timeformat:'unixtime',timezone:'GMT',forecast_days:'1'};
 const weather=new URL('https://api.open-meteo.com/v1/forecast');weather.search=new URLSearchParams({...params,current:weatherFields.join(','),temperature_unit:'celsius',wind_speed_unit:'kmh',precipitation_unit:'mm'}).toString();
 const air=new URL('https://air-quality-api.open-meteo.com/v1/air-quality');air.search=new URLSearchParams({...params,current:airFields.join(','),domains:'cams_global'}).toString();
 const results=await Promise.allSettled([read(weather).then(d=>({...parseConditions(d,weatherFields),source:'Open-Meteo'})).catch(()=>backupWeather(p)),read(air).then(d=>parseConditions(d,airFields))]);
 for(const [index,result] of results.entries())if(result.status==='rejected'){const e=result.reason;console.error('environment_provider_failed',index===0?'weather':'air',e instanceof Error?e.name:'Unknown',e instanceof Error?e.message.replace(/https?:\/\/[^\s]+/g,'[provider-url]').slice(0,200):'Unknown');}
 const data:EnvironmentData={fetchedAt:Date.now(),weather:results[0].status==='fulfilled'?results[0].value:null,air:results[1].status==='fulfilled'?results[1].value:null,weatherError:results[0].status==='rejected',airError:results[1].status==='rejected'};
 if(data.weather&&data.air){if(cache.size>=200)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+600000,data});}
 return data;
}
export async function searchPlaces(query:string):Promise<Place[]>{
 const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:query,count:'8',language:'vi',format:'json',countryCode:'VN'}).toString();
 const parsed=z.object({results:z.array(z.object({id:z.number(),name:z.string(),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),country_code:z.string(),admin1:z.string().optional(),admin2:z.string().optional()})).optional()}).parse(await read(url));
 return (parsed.results??[]).filter(p=>p.country_code==='VN').map(p=>({id:p.id,name:p.name,region:[p.admin2,p.admin1].filter(Boolean).join(', '),lat:p.latitude,lng:p.longitude}));
}
