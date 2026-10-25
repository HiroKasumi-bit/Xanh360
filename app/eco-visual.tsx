'use client';
import {useEffect} from 'react';
import {applyDaypart} from './daypart';

// The light of the hour behind every tab. The hero photograph and the sky wash of the page follow html[data-daypart]
// (app/daypart.ts, set before the first paint); this keeps it in step with the clock while the page stays open,
// checking every few minutes and whenever the tab comes back.
export function EcoAtmosphere(){
 useEffect(()=>{
  const sync=()=>{if(document.visibilityState==='visible')applyDaypart()};
  const timer=setInterval(sync,5*60*1000);document.addEventListener('visibilitychange',sync);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',sync)};
 },[]);
 return <div className="eco-atmosphere" aria-hidden="true"><i className="ambient-color ambient-sun"/></div>;
}

// The hero's picture of Saigon: a ghe ve chai crossing the river in front of Chợ Bến Thành, Nhà thờ Đức Bà, Bitexco,
// the Ba Son bridge and Landmark 81, one for each of four times of day. They are AI illustrations, not photographs, and
// the hero says so (.hero-credit in app/waste-app.tsx). The CSS picks the picture from html[data-daypart].
export function SaigonScene(){
 return <div className="eco-scene" aria-hidden="true"><div className="saigon-photo"/></div>;
}
