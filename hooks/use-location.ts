'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {readPosition, type DevicePosition} from '@/lib/device-access';
export function useLocation() {
 const [position,setPosition]=useState<DevicePosition>();
 const [locating,setLocating]=useState(false);
 const [locationError,setLocationError]=useState('');
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const locate=useCallback(async()=>{
  controller.current?.abort(); const current=new AbortController();controller.current=current;
  setLocating(true);setLocationError('');
  try { const next=await readPosition(current.signal); if(!current.signal.aborted)setPosition(next); }
  catch(e) { if(!current.signal.aborted)setLocationError((e as Error).message); }
  finally { if(!current.signal.aborted)setLocating(false); }
 },[]);
 const clearLocation=useCallback(()=>{controller.current?.abort();setPosition(undefined);setLocating(false);setLocationError('')},[]);
 return {position,locating,locationError,locate,clearLocation};
}
