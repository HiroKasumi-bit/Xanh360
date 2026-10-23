'use client';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import {Recycle,PackageCheck,Sparkles,Pause} from 'lucide-react';

export function EcoAtmosphere(){
 return <div className="eco-atmosphere" aria-hidden="true"><i className="ambient-color ambient-sun"/></div>;
}
// The hero's Saigon skyline, drawn as flat shapes lit from the top right like the rest of the page: Chợ Bến Thành,
// Nhà thờ Đức Bà, Bitexco, the Ba Son bridge and Landmark 81 above the Saigon river, with a ghe and its rower.
// preserveAspectRatio="xMaxYMax slice" keeps the landmarks on the right and the river at the bottom at every width;
// narrow heroes crop the empty river on the left. The loops (river shimmer, ghe, beacon, labels) only run while someone
// can see them: the hero is marked data-scene="asleep" (CSS pauses them) when it scrolls out of view or the page is hidden.
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
  <svg className="saigon-svg" viewBox="0 0 1000 300" preserveAspectRatio="xMaxYMax slice">
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
      <circle className="sg-beacon" cx="910" cy="13" r="2.4"/>
    </g>

    {/* Bitexco Financial Tower: the lotus bud with its helipad */}
    <g className="sg-bitexco">
      <path d="M700 246V170c0-28 10-50 26-70 4 6 7 9 10 12 6 16 8 34 8 58v76z" fill="url(#sg-bitexco)"/>
      <path className="sg-edge" d="M726 100c4 6 7 9 10 12 6 16 8 34 8 58v76"/>
      <path className="sg-mullion" d="M712 132v108M722 112v128M732 112v128"/>
      <path className="sg-helipad" d="M684 150h30v5h-30z"/>
      <path className="sg-helipad-rim" d="M684 150h30"/>
    </g>

    {/* Ba Son bridge (Thủ Thiêm 2): one leaning pylon and two fans of stays */}
    <g className="sg-bridge">
      <path className="sg-stay" d="M806 160L764 236M806 160L774 236M806 160L784 236M806 160L794 236M806 160L822 236M806 160L834 236M806 160L846 236M806 160L858 236"/>
      <path className="sg-pylon" d="M800 238l4-80h5l-1 80z"/>
      <path className="sg-deck" d="M752 236h120v4H752z"/>
    </g>

    {/* Nhà thờ Đức Bà: twin brick spires */}
    <g className="sg-cathedral">
      <path className="sg-brick" d="M528 246v-84h18v34h20v-34h18v84z"/>
      <path className="sg-brick-lit" d="M540 162h6v84h-6zM578 162h6v84h-6z"/>
      <path className="sg-spire" d="M528 162l9-40 9 40zM566 162l9-40 9 40z"/>
      <path className="sg-spire-lit" d="M537 122l9 40h-5zM575 122l9 40h-5z"/>
      <path className="sg-gable" d="M546 196l10-14 10 14z"/>
      <path className="sg-cross" d="M537 122v-12M534 114h6M575 122v-12M572 114h6"/>
      <circle className="sg-rose" cx="556" cy="206" r="5"/>
      <path className="sg-door" d="M550 246v-14a6 6 0 0 1 12 0v14zM533 246v-9a4 4 0 0 1 8 0v9zM571 246v-9a4 4 0 0 1 8 0v9z"/>
    </g>

    {/* Chợ Bến Thành: the long market hall and its clock tower */}
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

    {/* Street trees (cây dầu, cây me) along the bank */}
    <g className="sg-trees">
      <circle cx="360" cy="230" r="13"/><circle cx="374" cy="236" r="9"/><path d="M359 246v-12h2v12z"/>
      <circle cx="512" cy="230" r="11"/><path d="M511 246v-10h2v10z"/>
      <circle cx="606" cy="226" r="15"/><circle cx="624" cy="233" r="11"/><path d="M605 246v-14h2v14z"/>
      <circle cx="664" cy="232" r="10"/>
      <circle cx="962" cy="228" r="14"/><circle cx="980" cy="234" r="10"/>
    </g>

    {/* Bank, haze and the river */}
    <rect className="sg-bank" x="0" y="244" width="1000" height="5"/>
    <rect x="300" y="150" width="700" height="96" fill="url(#sg-haze)"/>
    <rect x="0" y="248" width="1000" height="52" fill="url(#sg-river)"/>
    <g className="sg-reflect">
      <path d="M904 254v38M912 254v30M896 256v18M724 254v26M556 254v16M450 256v12"/>
    </g>
    <g className="sg-water">
      <path d="M40 262h46M160 270h30M260 260h54M380 276h40M470 264h28M560 272h46M660 262h34M760 278h50M860 266h30M950 274h36M1040 262h46M1160 270h30M1260 260h54M1380 276h40M1470 264h28M1560 272h46M1660 262h34M1760 278h50M1860 266h30M1950 274h36"/>
    </g>

    {/* A ghe with a rower in a nón lá */}
    <g transform="translate(560 270)"><g className="sg-boat">
      <path className="sg-hull" d="M-26 0h52l-6 7h-40z"/>
      <path className="sg-hull" d="M-30-3l6 3h-6zM30-3l-6 3h6z"/>
      <path className="sg-rower" d="M12-11h4v11h-4z"/>
      <path className="sg-hat" d="M7-11l7-7 7 7z"/>
      <path className="sg-oar" d="M17-7l9 16"/>
    </g></g>
  </svg>
  <div className="floating-label label-recycle"><span><Recycle/></span><b>Tái chế</b></div>
  <div className="floating-label label-special"><span><PackageCheck/></span><b>Thu gom riêng</b></div>
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
