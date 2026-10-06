import {z} from 'zod';
export const coordinates=z.object({lat:z.number().finite().min(-90).max(90),lng:z.number().finite().min(-180).max(180)});
export type Coordinates=z.infer<typeof coordinates>;
export type Conditions={source?:string;time:number;values:Record<string,number|null>};
export type EnvironmentData={fetchedAt:number;weather:Conditions|null;air:Conditions|null;weatherError:boolean;airError:boolean};
export type Place={id:number;name:string;region:string;lat:number;lng:number};
export const weatherFields=['temperature_2m','apparent_temperature','relative_humidity_2m','precipitation','weather_code','wind_speed_10m'];
export const airFields=['us_aqi','pm2_5','pm10'];
export function coarsePosition(p:Coordinates):Coordinates{return{lat:Math.round(p.lat*100)/100,lng:Math.round(p.lng*100)/100}}
export function parseConditions(data:unknown,fields:string[]):Conditions{
 const parsed=z.object({current:z.object({time:z.number().finite().positive()}).catchall(z.unknown())}).parse(data);
 const values:Record<string,number|null>={};
 for(const key of fields){const value=parsed.current[key];values[key]=typeof value==='number'&&Number.isFinite(value)?value:null;}
 if(fields.every(k=>values[k]===null))throw new Error('No data');
 return {time:parsed.current.time,values};
}
export function aqiLevel(value:number|null|undefined){
 if(value==null||!Number.isFinite(value)||value<0)return{label:'Chưa có dữ liệu',tone:'missing'};
 if(value<=50)return{label:'Tốt',tone:'good'};
 if(value<=100)return{label:'Trung bình',tone:'moderate'};
 if(value<=150)return{label:'Không tốt cho nhóm nhạy cảm',tone:'sensitive'};
 if(value<=200)return{label:'Không tốt',tone:'unhealthy'};
 if(value<=300)return{label:'Rất không tốt',tone:'very-unhealthy'};
 return{label:'Nguy hại',tone:'hazardous'};
}
export function weatherLabel(code:number|null|undefined){
 if(code==null)return 'Chưa có mô tả thời tiết';
 if(code===0)return 'Trời quang';if(code<=3)return ['','Ít mây','Có mây','Nhiều mây'][code];
 if([45,48].includes(code))return 'Sương mù';if([51,53,55,56,57].includes(code))return 'Mưa phùn';
 if([61,63,65,66,67,80,81,82].includes(code))return 'Có mưa';
 if([71,73,75,77,85,86].includes(code))return 'Có tuyết';if([95,96,99].includes(code))return 'Dông';return 'Chưa có mô tả thời tiết';
}
export function isStale(time:number,now=Date.now()){return time*1000<now-3*3600000||time*1000>now+3600000}
