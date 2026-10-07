// Motion helpers for scripts. CSS reads html[data-motion] directly; scripts that animate or scroll ask here, so the
// visitor's "Dừng hiệu ứng" choice and the system setting count the same everywhere.
export function motionReduced(){
 return typeof document!=='undefined'&&document.documentElement.dataset.motion==='reduced';
}
// A duration token from :root in milliseconds (--dur-base and friends). The build may rewrite 220ms as .22s.
export function durationToken(name:string,fallback:number){
 const value=getComputedStyle(document.documentElement).getPropertyValue(name).trim();const n=parseFloat(value);
 return Number.isFinite(n)?(value.endsWith('ms')?n:n*1000):fallback;
}
export function easingToken(name:string,fallback:string){
 return getComputedStyle(document.documentElement).getPropertyValue(name).trim()||fallback;
}
