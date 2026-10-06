'use client';
import {useEffect,useState} from 'react';
import {LocateFixed,Loader2,MapPin,ExternalLink,CheckCircle2} from 'lucide-react';
import type {DevicePosition} from '@/lib/device-access';
export default function LocationStatus({position,locating,error,onLocate,onClear,onManual}:{position?:DevicePosition;locating:boolean;error:string;onLocate:()=>void;onClear:()=>void;onManual?:()=>void}){
 const[url,setUrl]=useState('/');const[embedded,setEmbedded]=useState(false);
 useEffect(()=>{setUrl(window.location.origin+window.location.pathname);setEmbedded(window.self!==window.top)},[]);
 return <div className="location-status">
  <button className="btn-outline wide" disabled={locating} onClick={onLocate}>{locating?<Loader2 className="spin"/>:<LocateFixed/>}{locating?'Đang lấy vị trí…':position?'Cập nhật vị trí':'Dùng vị trí hiện tại'}</button>
  {locating&&<p className="small" role="status">Cho phép quyền Vị trí khi trình duyệt hỏi. Có thể mất vài giây.</p>}
  {error&&<div className="location-error" role="alert"><p>{error}</p><a className="text-button" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink/>Mở ở tab riêng</a></div>}
  {position&&<div className="position-card" role="status"><strong><CheckCircle2/>Đã nhận vị trí</strong><span>{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</span><small>Cập nhật lúc {new Date(position.timestamp).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</small><small>Độ chính xác ước tính: ±{Math.round(position.accuracy).toLocaleString('vi-VN')} m</small>{position.accuracy>1000&&<small>Vị trí còn khá rộng. Hãy bật GPS và thử cập nhật lại.</small>}<div className="position-actions"><a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(position.lat+','+position.lng)} target="_blank" rel="noopener noreferrer">Xem vị trí trên bản đồ</a><button className="text-button" onClick={onClear}>Xóa vị trí</button></div><small>Không lưu vị trí vào lịch sử. Khu vực lọc vẫn do bạn chọn; chưa tự đối chiếu ranh giới.</small></div>}
  {embedded&&!error&&<a className="text-button small" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink/>Nếu bị chặn quyền, mở ở tab riêng</a>}
  {onManual&&<button className="text-button" onClick={onManual}><MapPin/>Chọn khu vực thủ công</button>}
 </div>
}
