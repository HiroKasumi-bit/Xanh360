'use client';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import {Sparkles,Pause} from 'lucide-react';

export function EcoAtmosphere(){
 return <div className="eco-atmosphere" aria-hidden="true"><i className="ambient-color ambient-sun"/></div>;
}
// The hero's Saigon skyline by day, drawn as flat shapes lit from the top right like the rest of the page: Chợ Bến
// Thành, Nhà thờ Đức Bà, Bitexco, the Ba Son bridge and Landmark 81 above the Saigon river, where a ghe ve chai carries
// the day's sorted haul. The view box runs 700 units of river and far bank to the left of the landmarks; with
// preserveAspectRatio="xMaxYMax slice" at a fixed height, the landmarks keep to the right of the copy on wide heroes and
// narrow ones crop only that empty river. The two loops (river shimmer, ghe) only run while someone can see them: the hero is marked data-scene="asleep" (CSS
// pauses them) when it scrolls out of view or the page is hidden.
export function SaigonScene(){
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
  <svg className="saigon-svg" viewBox="-700 0 1700 300" preserveAspectRatio="xMaxYMax slice">
    <defs>
      <linearGradient id="sg-river" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2a6f70"/>
        <stop offset=".45" stopColor="#1b5552"/>
        <stop offset="1" stopColor="#0d3530"/>
      </linearGradient>
      <linearGradient id="sg-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#1f5e4b"/>
        <stop offset=".62" stopColor="#2a755b"/>
        <stop offset="1" stopColor="#3f9473"/>
      </linearGradient>
      <linearGradient id="sg-bitexco" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#205f5c"/>
        <stop offset=".55" stopColor="#2b7470"/>
        <stop offset="1" stopColor="#4a9a8c"/>
      </linearGradient>
      <linearGradient id="sg-haze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0f3a2e" stopOpacity="0"/>
        <stop offset="1" stopColor="#0f3a2e" stopOpacity=".55"/>
      </linearGradient>
    </defs>

    {/* Far bank under the copy: a low, dim line of trees and roofs, so the river never starts at a hard edge */}
    <path className="sg-far-low" d="M-700 246v-8h40v-5h30v6h50v-9h24v7h60v-4h36v8h44v-10h22v6h70v-5h40v7h56v-8h30v5h64v-6h44v9h52v-7h28v5h60v-9h36v7h48v-4h46v10z"/>

    {/* Far city: low blocks behind the landmarks */}
    <path className="sg-far" d="M300 246V222h18v-10h14v16h22v-30h16v20h20v-14h26v22h18v-40h20v26h16v-18h22v30h24v-46h14v20h20v-28h18v34h22v-22h14v-16h18v38h20v-54h12v26h24v-18h16v34h26v-30h18v20h22v-44h14v30h24v-12h18v26h20v-36h16v22h20v-16h26v32h14v-20h22v34h16v-26h22v42z"/>

    {/* Landmark 81: a bundle of stepped glass shafts with a crown of fins */}
    <g className="sg-l81">
      <rect x="874" y="150" width="14" height="96" fill="url(#sg-glass)"/>
      <rect x="888" y="96" width="14" height="150" fill="url(#sg-glass)"/>
      <rect x="902" y="42" width="16" height="204" fill="url(#sg-glass)"/>
      <rect x="918" y="74" width="14" height="172" fill="url(#sg-glass)"/>
      <rect x="932" y="126" width="14" height="120" fill="url(#sg-glass)"/>
      <path className="sg-edge" d="M888 150v-54M902 96V42M918 42v32M932 74v52M946 126v120"/>
      <path className="sg-crown" d="M904 42V24M908 42V16M912 42V16M916 42V24"/>
      <path className="sg-mullion" d="M881 160v80M895 106v134M910 52v188M925 84v156M939 136v104"/>
    </g>

    {/* Bitexco Financial Tower: the lotus bud, its helipad cantilevered on a strut */}
    <g className="sg-bitexco">
      <path d="M700 246V170c0-28 10-50 26-70 4 6 7 9 10 12 6 16 8 34 8 58v76z" fill="url(#sg-bitexco)"/>
      <path className="sg-edge" d="M726 100c4 6 7 9 10 12 6 16 8 34 8 58v76"/>
      <path className="sg-mullion" d="M712 132v108M722 112v128M732 112v128"/>
      <path className="sg-helipad-strut" d="M701 162l-11-9"/>
      <ellipse className="sg-helipad" cx="692" cy="151.5" rx="13" ry="2.6"/>
      <path className="sg-helipad-rim" d="M679 151a13 2.4 0 0 1 26 0"/>
    </g>

    {/* Ba Son bridge (Thủ Thiêm 2): a raised deck on slim piers, the single pylon leaning towards the main span */}
    <g className="sg-bridge">
      <path className="sg-stay" d="M821 152L840 228M821 152L854 228M821 152L868 228M821 152L882 228M821 152L760 228M821 152L772 228M821 152L784 228M821 152L796 228"/>
      <path className="sg-pylon" d="M794 246l23-94h7l-21 94z"/>
      <path className="sg-deck" d="M750 226h138v4H750z"/>
      <path className="sg-deck" d="M762 230h3v16h-3zM850 230h3v16h-3zM878 230h3v16h-3z"/>
    </g>

    {/* Nhà thờ Đức Bà: twin brick towers under slate spires, drawn three quarters scale so it stays below Bitexco */}
    <g className="sg-cathedral" transform="translate(556 246) scale(.75) translate(-556 -246)">
      <path className="sg-brick" d="M528 246v-84h18v34h20v-34h18v84z"/>
      <path className="sg-brick-lit" d="M540 162h6v84h-6zM578 162h6v84h-6z"/>
      <path className="sg-spire" d="M528 162l9-40 9 40zM566 162l9-40 9 40z"/>
      <path className="sg-spire-lit" d="M537 122l9 40h-5zM575 122l9 40h-5z"/>
      <path className="sg-gable" d="M546 196l10-14 10 14z"/>
      <path className="sg-cross" d="M537 122v-12M534 114h6M575 122v-12M572 114h6"/>
      <circle className="sg-rose" cx="556" cy="206" r="5"/>
      <path className="sg-door" d="M550 246v-14a6 6 0 0 1 12 0v14zM533 246v-9a4 4 0 0 1 8 0v9zM571 246v-9a4 4 0 0 1 8 0v9z"/>
    </g>

    {/* Chợ Bến Thành: the long cream market hall and its clock tower */}
    <g className="sg-market">
      <path className="sg-sand" d="M398 246v-30h34v-6h36v6h34v30z"/>
      <path className="sg-sand" d="M436 210v-36h28v36z"/>
      <path className="sg-sand-lit" d="M456 174h8v36h-8zM494 216h8v30h-8z"/>
      <path className="sg-roof" d="M432 176l18-14 18 14z"/>
      <circle className="sg-clock" cx="450" cy="190" r="7"/>
      <path className="sg-hands" d="M450 190v-4.5M450 190l3.2 2"/>
      <path className="sg-door" d="M442 246v-16a8 8 0 0 1 16 0v16z"/>
      <path className="sg-arcade" d="M406 238v-8a4 4 0 0 1 8 0v8M420 238v-8a4 4 0 0 1 8 0v8M472 238v-8a4 4 0 0 1 8 0v8M486 238v-8a4 4 0 0 1 8 0v8"/>
    </g>

    {/* Cây dầu along the bank: tall bare trunks with small crowns high up */}
    <g className="sg-trees">
      <path d="M359 246V206h2v40zM379 246V214h2v32zM511 246V214h2v32zM607 246V200h2v46zM627 246V212h2v34zM665 246V210h2v36zM961 246V204h2v42zM981 246V216h2v30z"/>
      <ellipse cx="360" cy="203" rx="9" ry="6"/><ellipse cx="366" cy="207" rx="6" ry="4"/>
      <ellipse cx="380" cy="211" rx="7" ry="5"/>
      <ellipse cx="512" cy="211" rx="8" ry="5"/>
      <ellipse cx="608" cy="197" rx="10" ry="6"/><ellipse cx="601" cy="201" rx="6" ry="4"/>
      <ellipse cx="628" cy="209" rx="7" ry="5"/>
      <ellipse cx="666" cy="207" rx="8" ry="5"/>
      <ellipse cx="962" cy="201" rx="10" ry="6"/><ellipse cx="969" cy="205" rx="6" ry="4"/>
      <ellipse cx="982" cy="213" rx="7" ry="4.5"/>
    </g>

    {/* Bank, haze and the river */}
    <rect className="sg-bank" x="-700" y="244" width="1700" height="5"/>
    <rect x="300" y="150" width="700" height="96" fill="url(#sg-haze)"/>
    <rect x="-700" y="248" width="1700" height="52" fill="url(#sg-river)"/>
    <g className="sg-reflect">
      <path d="M904 254v38M912 254v30M896 256v18M724 254v26M556 254v16M450 256v12"/>
    </g>
    <g className="sg-water">
      <path d="M-960 262h46M-840 270h30M-740 260h54M-620 276h40M-530 264h28M-440 272h46M-340 262h34M-240 278h50M-140 266h30M-50 274h36M40 262h46M160 270h30M260 260h54M380 276h40M470 264h28M560 272h46M660 262h34M760 278h50M860 266h30M950 274h36M1040 262h46M1160 270h30M1260 260h54M1380 276h40M1470 264h28M1560 272h46M1660 262h34M1760 278h50M1860 266h30M1950 274h36"/>
    </g>

    {/* A ghe ve chai: the day's sorted haul (cardboard, a sack of bottles, a sack of cans) rowed down the river */}
    <g transform="translate(540 270) scale(1.45)"><g className="sg-boat">
      <path className="sg-hull" d="M-30 0h60l-7 8h-46z"/>
      <path className="sg-hull" d="M-34-4l6 4h-6zM34-4l-6 4h6z"/>
      <path className="sg-hull-lit" d="M-30 0h60l-.8 1h-58.4z"/>
      <rect className="sg-bale-card" x="-25" y="-9" width="13" height="9" rx="1"/>
      <path className="sg-bale-tie" d="M-25-4.5h13M-18.5-9v9"/>
      <rect className="sg-bale-bottles" x="-11" y="-12" width="11" height="12" rx="4.5"/>
      <rect className="sg-bale-cans" x="1" y="-8.5" width="10" height="8.5" rx="3.5"/>
      <path className="sg-rower" d="M17-12h4v12h-4z"/>
      <circle className="sg-rower" cx="19" cy="-14.5" r="2.4"/>
      <path className="sg-oar" d="M20-8l10 17"/>
    </g></g>
  </svg>
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
