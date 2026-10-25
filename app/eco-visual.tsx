'use client';
import {useEffect} from 'react';
import {applyDaypart} from './daypart';

// The hero's photograph of Saigon: a ghe ve chai crossing the river in front of Chợ Bến Thành, Nhà thờ Đức Bà, Bitexco,
// the Ba Son bridge and Landmark 81, rendered in Blender for four times of day (scripts/blender/saigon_hero.py). The CSS
// picks the picture from html[data-daypart] (app/daypart.ts, set before the first paint); this keeps it in step with the
// clock while the page stays open, checking every few minutes and whenever the tab comes back.
export function SaigonScene(){
 useEffect(()=>{
  const sync=()=>{if(document.visibilityState==='visible')applyDaypart()};
  const timer=setInterval(sync,5*60*1000);document.addEventListener('visibilitychange',sync);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',sync)};
 },[]);
 return <div className="eco-scene" aria-hidden="true"><div className="saigon-photo"/></div>;
}
