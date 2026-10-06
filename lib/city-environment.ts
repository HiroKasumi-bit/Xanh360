import type {EnvironmentData} from './environment';
// Approximate geographic reference points, not monitoring stations or administrative centroids.
export const cityPoints=[
 {id:'central',name:'Khu vực trung tâm',lat:10.78,lng:106.70},
 {id:'north',name:'Khu vực Thủ Dầu Một',lat:10.98,lng:106.65},
 {id:'coast',name:'Khu vực Vũng Tàu',lat:10.35,lng:107.08},
 {id:'can-gio',name:'Khu vực Cần Giờ',lat:10.41,lng:106.96},
 {id:'island',name:'Khu vực Côn Đảo',lat:8.69,lng:106.61},
];
export type CityEnvironment={points:(EnvironmentData&{id:string;name:string})[]};
export function range(values:(number|null|undefined)[]){const valid=values.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));return valid.length?{min:Math.min(...valid),max:Math.max(...valid),count:valid.length}:null}
