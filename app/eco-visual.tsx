'use client';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Loader2,Pause,Rotate3d,Sparkles,X} from 'lucide-react';

export function EcoAtmosphere(){
 return <div className="eco-atmosphere" aria-hidden="true"><i className="ambient-color ambient-sun"/></div>;
}
// The hero's Saigon skyline in 3D (app/saigon-3d): Chợ Bến Thành, Nhà thờ Đức Bà, Bitexco, the Ba Son bridge and
// Landmark 81 across the river, a ghe ve chai rowed by a woman in a nón lá. The page shows a still rendered in Blender
// from the same layout (scripts/blender/saigon_still.py), so nothing heavy loads up front; "Xem 3D" loads three.js and
// swaps in the live scene at the same framing. The live view stops when pressed again, when the visitor turns decorative
// motion off, or when the component unmounts. The hero is also marked data-scene="asleep" off screen, which pauses its
// CSS loops.
type Live3d={stop():void};
export function SaigonScene(){
 const scene=useRef<HTMLDivElement>(null);
 const host=useRef<HTMLDivElement>(null);
 const live=useRef<Live3d|null>(null);
 const [mode,setMode]=useState<'still'|'loading'|'live'|'failed'>('still');
 useEffect(()=>{
  const hero=scene.current?.closest<HTMLElement>('.hero-intro');if(!hero)return;
  let onScreen=true;
  const sync=()=>{hero.dataset.scene=onScreen&&document.visibilityState==='visible'?'awake':'asleep'};
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{onScreen=entries[entries.length-1].isIntersecting;sync()}):null;
  observer?.observe(hero);document.addEventListener('visibilitychange',sync);sync();
  return()=>{observer?.disconnect();document.removeEventListener('visibilitychange',sync);delete hero.dataset.scene};
 },[]);
 const stop=useCallback(()=>{live.current?.stop();live.current=null;setMode('still')},[]);
 // Turning decorative motion off (the header toggle or the system setting changing) also ends the live view.
 useEffect(()=>{
  if(mode!=='live')return;
  const root=document.documentElement;const was=root.dataset.motion;
  const watch=new MutationObserver(()=>{if(root.dataset.motion==='reduced'&&was!=='reduced')stop()});
  watch.observe(root,{attributes:true,attributeFilter:['data-motion']});
  return()=>watch.disconnect();
 },[mode,stop]);
 useEffect(()=>()=>live.current?.stop(),[]);
 const start=async()=>{
  if(!host.current)return;
  setMode('loading');
  try{
   const {startSaigon3d}=await import('./saigon-3d/live');
   if(!host.current)return;
   live.current=startSaigon3d(host.current,()=>setMode('live'));
  }catch{live.current?.stop();live.current=null;setMode('failed')}
 };
 // A failure note clears itself after a while; the button can try again at any time.
 useEffect(()=>{if(mode!=='failed')return;const t=setTimeout(()=>setMode('still'),6000);return()=>clearTimeout(t)},[mode]);
 const loading=mode==='loading';
 // The label names what the button does next, so it carries no pressed state. While loading it keeps focus (aria-disabled
 // rather than disabled) and ignores presses. The note under it is a live region that stays in the page, so turning 3D on
 // or failing to is announced.
 return <div className="eco-scene" data-mode={mode} ref={scene}>
  <img className="saigon-still" src="/hero/saigon-3d-2400.webp" srcSet="/hero/saigon-3d-1200.webp 1200w, /hero/saigon-3d-2400.webp 2400w" sizes="(max-width: 640px) max(470px, 100vw), (max-width: 1179px) max(924px, 100vw), 1134px" alt="" width={2400} height={571} decoding="async" fetchPriority="high"/>
  <div className="saigon-live" ref={host}/>
  <button type="button" className="scene-toggle" aria-disabled={loading||undefined} aria-busy={loading||undefined} onClick={()=>{if(loading)return;if(mode==='live')stop();else void start()}}>
   {loading?<Loader2 className="spin" aria-hidden="true"/>:mode==='live'?<X aria-hidden="true"/>:<Rotate3d aria-hidden="true"/>}
   <span>{loading?'Đang tải 3D…':mode==='live'?'Tắt 3D':'Xem 3D'}</span>
  </button>
  <p className="scene-hint" role="status">{mode==='live'?'Đã bật 3D. Kéo để xoay':mode==='failed'?'Chưa mở được 3D. Hãy thử lại.':''}</p>
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
