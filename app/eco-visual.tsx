'use client';
import {useEffect,useState} from 'react';
import {Recycle,Leaf,BatteryMedium,Sparkles,Pause,Play} from 'lucide-react';

export function EcoAtmosphere(){
 return <div className="eco-atmosphere" aria-hidden="true"><i className="ambient-color ambient-sun"/></div>;
}
export function EcoScene(){
 return <div className="eco-scene" aria-hidden="true">
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
export function MotionControl(){
 const[paused,setPaused]=useState(false);const[systemReduced,setSystemReduced]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const sync=()=>setSystemReduced(media.matches);sync();
  try{setPaused(localStorage.getItem('xanh360-motion')==='paused')}catch{}
  media.addEventListener('change',sync);
  const visibility=()=>document.documentElement.classList.toggle('page-asleep',document.hidden);
  document.addEventListener('visibilitychange',visibility);visibility();
  return()=>{media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',visibility);document.documentElement.classList.remove('effects-paused','page-asleep')};
 },[]);
 useEffect(()=>{document.documentElement.classList.toggle('effects-paused',paused||systemReduced)},[paused,systemReduced]);
 return <button className="motion-control" aria-pressed={paused||systemReduced} disabled={systemReduced} title={systemReduced?'Thiết bị đang bật chế độ giảm chuyển động.':'Bật hoặc tắt các chuyển động trang trí'} onClick={()=>{const next=!paused;setPaused(next);try{localStorage.setItem('xanh360-motion',next?'paused':'active')}catch{}}}>{systemReduced?<Sparkles/>:paused?<Play/>:<Pause/>}<span>{systemReduced?'Chuyển động nhẹ':paused?'Bật hiệu ứng':'Dừng hiệu ứng'}</span></button>;
}
