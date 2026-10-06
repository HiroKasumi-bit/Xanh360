'use client';
import {useEffect,useState} from 'react';
import {Recycle,Leaf,Battery,Sparkles,Pause,Play} from 'lucide-react';

export function EcoAtmosphere(){
 return <div className="eco-atmosphere" aria-hidden="true"><i className="ambient-color ambient-mint"/><i className="ambient-color ambient-lilac"/><i className="ambient-color ambient-sun"/></div>;
}
export function EcoScene(){
 return <div className="eco-scene" aria-hidden="true">
  <div className="scene-halo"/>
  <div className="scene-dots"><i/><i/><i/><i/><i/><i/></div>
  <div className="orb-orbit orbit-one"/><div className="orb-orbit orbit-two"/>
  <div className="planet-float"><div className="eco-planet"><div className="planet-latitude latitude-one"/><div className="planet-latitude latitude-two"/><div className="planet-meridian"/><div className="planet-emblem"><Recycle strokeWidth={1.35}/></div><div className="planet-glint"/></div></div>
  <div className="floating-label label-recycle"><span><Recycle/></span><div><small>MỘT VÒNG ĐỜI MỚI</small><b>Tái chế</b></div></div>
  <div className="floating-label label-leaf"><span><Leaf/></span><div><small>TỪ VIỆC NHỎ MỖI NGÀY</small><b>Sống xanh</b></div></div>
  <div className="floating-label label-special"><span><Battery/></span><div><small>ĐƯA VỀ ĐÚNG NƠI</small><b>Thu gom riêng</b></div></div>
  <div className="scene-caption"><span/>CHỌN ĐÚNG HÔM NAY · XANH HƠN NGÀY MAI</div>
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
