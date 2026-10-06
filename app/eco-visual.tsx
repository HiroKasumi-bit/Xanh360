'use client';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import {Recycle,Leaf,BatteryMedium,Sparkles,Pause} from 'lucide-react';

export function EcoAtmosphere(){
 return <div className="eco-atmosphere" aria-hidden="true"><i className="ambient-color ambient-sun"/></div>;
}
// The scene's loops only run while someone can see them: the hero is marked data-scene="asleep" (CSS pauses the loops)
// when it scrolls out of view or the page is hidden.
export function EcoScene(){
 const scene=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const hero=scene.current?.closest<HTMLElement>('.hero-intro');if(!hero)return;
  let onScreen=true;
  const sync=()=>{hero.dataset.scene=onScreen&&document.visibilityState==='visible'?'awake':'asleep'};
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{onScreen=entries[entries.length-1].isIntersecting;sync()}):null;
  observer?.observe(hero);document.addEventListener('visibilitychange',sync);sync();
  return()=>{observer?.disconnect();document.removeEventListener('visibilitychange',sync);delete hero.dataset.scene};
 },[]);
 return <div className="eco-scene" aria-hidden="true" ref={scene}>
  <div className="planet-shadow"/>
  <div className="planet-float"><div className="eco-planet">
   {/* Surface and clouds are seamless tiles (public/globe, made by scripts/generate-globe-textures.mjs) on strips two globes wide. */}
   <div className="planet-surface"/><div className="planet-clouds"/>
   <div className="planet-light"/>
  </div></div>
  <div className="floating-label label-recycle"><span><Recycle/></span><b>Tái chế</b></div>
  <div className="floating-label label-leaf"><span><Leaf/></span><b>Sống xanh</b></div>
  <div className="floating-label label-special"><span><BatteryMedium/></span><b>Thu gom riêng</b></div>
 </div>;
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
