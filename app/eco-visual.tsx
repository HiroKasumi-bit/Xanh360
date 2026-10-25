'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {Pause,Sparkles} from 'lucide-react';
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

// Reduced motion lives on html[data-motion] and html[data-motion-source], set before the first paint by the inline
// script in app/layout.tsx. This store keeps them in sync with later changes: the toggle, the system setting, other tabs.
const MOTION_KEY='xanh360-motion';const MOTION_EVENT='xanh360-motion-change';const REDUCE_QUERY='(prefers-reduced-motion: reduce)';
let sessionChoice:string|null=null;// this tab's choice, which still works when the browser blocks storage
function savedChoice(){try{return sessionChoice??localStorage.getItem(MOTION_KEY)}catch{return sessionChoice}}
function applyMotion(){
 const root=document.documentElement;let system=false;try{system=window.matchMedia(REDUCE_QUERY).matches}catch{}
 const paused=savedChoice()==='paused';root.dataset.motion=system||paused?'reduced':'full';root.dataset.motionSource=system?'system':paused?'user':'none';
}
function subscribe(onChange:()=>void){
 const media=window.matchMedia(REDUCE_QUERY);const sync=()=>{applyMotion();onChange()};
 const storage=(e:StorageEvent)=>{if(e.key===MOTION_KEY){sessionChoice=null;sync()}};
 media.addEventListener('change',sync);window.addEventListener(MOTION_EVENT,sync);window.addEventListener('storage',storage);applyMotion();
 return()=>{media.removeEventListener('change',sync);window.removeEventListener(MOTION_EVENT,sync);window.removeEventListener('storage',storage)};
}
const pausedByVisitor=()=>document.documentElement.dataset.motionSource==='user';
// One toggle with a constant label; aria-pressed carries the state. When the system already asks for reduced motion,
// there is nothing to switch, so a plain line says so instead (CSS shows one or the other from data-motion-source,
// already right at first paint).
export function MotionControl(){
 const paused=useSyncExternalStore(subscribe,pausedByVisitor,()=>false);
 const toggle=()=>{const next=paused?'active':'paused';sessionChoice=next;try{localStorage.setItem(MOTION_KEY,next)}catch{}window.dispatchEvent(new Event(MOTION_EVENT))};
 return <>
  <button type="button" className="motion-control" aria-pressed={paused} title={paused?'Hiệu ứng trang trí đang dừng. Bấm lần nữa để bật lại.':'Dừng các chuyển động trang trí'} onClick={toggle}><Pause aria-hidden="true"/><span>Dừng hiệu ứng</span></button>
  <p className="motion-status"><Sparkles aria-hidden="true"/><span>Đã giảm chuyển động theo cài đặt thiết bị</span></p>
 </>;
}
