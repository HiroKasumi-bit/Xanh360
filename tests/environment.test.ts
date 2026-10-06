import {describe,it,expect,vi,afterEach} from 'vitest';
import {coordinates,coarsePosition,parseConditions,aqiLevel,isStale,weatherLabel} from '@/lib/environment';
import {getEnvironment,searchPlaces} from '@/lib/environment-provider';
afterEach(()=>vi.unstubAllGlobals());
describe('environment data integrity',()=>{
 it('rejects invalid coordinates',()=>{expect(coordinates.safeParse({lat:91,lng:106}).success).toBe(false)});
 it('rounds coordinates before provider requests',()=>{expect(coarsePosition({lat:10.776543,lng:106.701234})).toEqual({lat:10.78,lng:106.7})});
 it('preserves zero and missing values without inventing readings',()=>{expect(parseConditions({current:{time:1700000000,pm2_5:0}},['pm2_5','pm10']).values).toEqual({pm2_5:0,pm10:null})});
 it('rejects empty provider results',()=>expect(()=>parseConditions({current:{time:1700000000}},['us_aqi'])).toThrow());
 it('keeps AQI bands distinct at boundaries',()=>{expect([0,50,51,100,101,150,151,200,201,300,301].map(v=>aqiLevel(v).tone)).toEqual(['good','good','moderate','moderate','sensitive','sensitive','unhealthy','unhealthy','very-unhealthy','very-unhealthy','hazardous']);expect(aqiLevel(null).tone).toBe('missing')});
 it('marks old data stale',()=>{expect(isStale(1700000000,1700000000*1000+4*3600000)).toBe(true);expect(isStale(1700000000,1700000000*1000)).toBe(false)});
 it('does not call missing weather clear sky',()=>{expect(weatherLabel(null)).toContain('Chưa');expect(weatherLabel(95)).toBe('Dông')});
 it('retains weather if air fails and sends coarse coordinates',async()=>{
 const fetcher=vi.fn(async(url:URL)=>{if(url.hostname==='air-quality-api.open-meteo.com')throw new Error('offline');expect(url.searchParams.get('latitude')).toBe('10.79');return Response.json({current:{time:1700000000,temperature_2m:30}})});vi.stubGlobal('fetch',fetcher);
 const r=await getEnvironment({lat:10.78912,lng:106.72222});expect(r.weather?.values.temperature_2m).toBe(30);expect(r.air).toBeNull();expect(r.airError).toBe(true);
 });
 it('returns both unavailable honestly',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));const r=await getEnvironment({lat:11,lng:107});expect(r.air).toBeNull();expect(r.weather).toBeNull()});
 it('filters geocoding to Vietnam',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({results:[{id:1,name:'Test',latitude:11,longitude:107,country_code:'VN'},{id:2,name:'Other',latitude:11,longitude:107,country_code:'US'}]})));expect(await searchPlaces('Test')).toHaveLength(1)});
});

import {range,cityPoints} from '@/lib/city-environment';
it('city ranges exclude missing values and preserve zero',()=>{expect(range([null,0,40,undefined])).toEqual({min:0,max:40,count:2});expect(range([null])).toBeNull()});
it('city overview includes mainland and island reference points',()=>{expect(cityPoints).toHaveLength(5);expect(cityPoints.some(p=>p.id==='island')).toBe(true)});

it('uses edge-compatible manual redirects and rejects redirected responses',async()=>{const fetcher=vi.fn(async(_url:URL,init:RequestInit)=>{expect(init.redirect).toBe('manual');return new Response(null,{status:302,headers:{Location:'https://example.com'}})});vi.stubGlobal('fetch',fetcher);await expect(searchPlaces('Test')).rejects.toThrow('Provider HTTP 302');expect(fetcher).toHaveBeenCalledTimes(1)});

import {parseMetWeather} from '@/lib/weather-backup';
it('backup selects the current forecast and converts wind units',()=>{const now=Date.parse('2026-10-04T09:30:00Z');const data={properties:{timeseries:[{time:'2026-10-04T09:00:00Z',data:{instant:{details:{air_temperature:28,wind_speed:2}}}}]}};expect(parseMetWeather(data,now).values.wind_speed_10m).toBe(7.2);expect(parseMetWeather(data,now).source).toBe('MET Norway');expect(()=>parseMetWeather(data,now+7200000)).toThrow('No current forecast')});
