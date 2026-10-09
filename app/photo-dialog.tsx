'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Camera, ImagePlus, Upload, RefreshCw, Trash2, Loader2, CheckCircle2, Search, ShieldCheck, ExternalLink, ScanLine, X} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {api} from '@/lib/client';
import {composedValue} from '@/lib/utils';
import {IMAGE_MAX_EDGE, prepareImage} from '@/lib/image';
import {cameraErrorMessage, featureAllowed, stopCamera} from '@/lib/device-access';
import {type Item, searchItems} from '@/lib/domain';
import {durationToken, motionReduced} from './motion';

type Candidate = {itemId: string; label: string};
export default function PhotoDialog({initialMode, canRecognize, catalogReady, items, onClose, onChoose}: {
  initialMode: 'upload' | 'camera'; canRecognize: boolean; catalogReady: boolean; items: Item[];
  onClose: () => void; onChoose: (item: Item) => void;
}) {
  const [image, setImage] = useState('');
  const [fileName, setFileName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [cameraState, setCameraState] = useState<'idle'|'requesting'|'live'>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [dragging, setDragging] = useState(false);
  const [consent, setConsent] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [manual, setManual] = useState('');
  const [embedded, setEmbedded] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const nativeCamera = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const cameraGeneration = useRef(0);
  const alive = useRef(true);
  const request = useRef<AbortController | null>(null);
  // The dialog closes itself first, so Radix can play the exit animation, and tells the page to unmount it afterwards.
  const [open, setOpen] = useState(true);
  const closeTimer = useRef(0);
  const close = () => {
    setOpen(false); window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(onClose, motionReduced() ? 0 : durationToken('--dur-base', 220) + 40);
  };
  const pick = (item: Item) => { close(); onChoose(item); };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const stop = useCallback(() => {
    cameraGeneration.current++;
    stopCamera(stream.current); stream.current = null;
    setCameraState('idle'); setCameraReady(false);
  }, []);
  const invalidate = () => { generation.current++; request.current?.abort(); setRecognizing(false); setStatus(''); setCandidates([]); setError(''); };
  const startCamera = useCallback(async () => {
    const seq = ++cameraGeneration.current;
    stopCamera(stream.current); stream.current = null;
    setCameraReady(false); setCameraError('');
    if (!window.isSecureContext || !featureAllowed('camera')) {
      setCameraState('idle'); setCameraError('Camera chưa được cho phép trong cửa sổ này. Hãy mở website ở tab riêng và cấp quyền Camera, hoặc chọn ảnh có sẵn.'); return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('idle'); setCameraError('Trình duyệt chưa hỗ trợ xem camera trực tiếp. Hãy dùng camera của thiết bị hoặc tải ảnh bên dưới.'); return;
    }
    setCameraState('requesting');
    try {
      const next = await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: 'environment'}, width: {ideal: 1600}, height: {ideal: 1200}}});
      if (!alive.current || seq !== cameraGeneration.current) { stopCamera(next); return; }
      stream.current = next; setCameraState('live');
      next.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (alive.current && seq === cameraGeneration.current) { stopCamera(next); stream.current = null; setCameraState('idle'); setCameraReady(false); setCameraError('Camera đã ngắt. Bấm Mở camera để kết nối lại.'); }
      }, {once: true}));
    } catch (e) {
      if (alive.current && seq === cameraGeneration.current) { setCameraState('idle'); setCameraError(cameraErrorMessage(e)); }
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    setEmbedded(window.self !== window.top); setSiteUrl(window.location.origin + window.location.pathname);
    if (initialMode === 'camera') void startCamera();
    const hide = () => { if (document.visibilityState === 'hidden') stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { alive.current = false; generation.current++; cameraGeneration.current++; request.current?.abort(); stopCamera(stream.current); stream.current = null; document.removeEventListener('visibilitychange', hide); };
  }, [initialMode, startCamera, stop]);
  useEffect(() => {
    let cancelled = false;
    if (cameraState === 'live' && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => { if (!cancelled && alive.current) { stop(); setCameraError('Chưa phát được hình từ camera. Hãy thử lại hoặc dùng camera của thiết bị.'); } });
    }
    return () => { cancelled = true; };
  }, [cameraState, stop]);

  async function selectImage(file?: File) {
    if (!file) return;
    stop(); invalidate(); const seq = generation.current;
    setProcessing(true); setImage(''); setFileName(''); setCandidates([]); setError(''); setStatus(''); setConsent(false);
    try {
      const prepared = await prepareImage(file);
      if (alive.current && seq === generation.current) { setImage(prepared); setFileName(file.name); setStatus('Ảnh đã sẵn sàng trên thiết bị. Chưa gửi đi.'); }
    } catch (e) { if (alive.current && seq === generation.current) setError((e as Error).message); }
    finally { if (alive.current && seq === generation.current) setProcessing(false); }
  }
  async function capture() {
    const element = video.current;
    if (!element || !element.videoWidth || !cameraReady) return;
    const cameraSeq = cameraGeneration.current;
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, IMAGE_MAX_EDGE / Math.max(element.videoWidth, element.videoHeight));
    canvas.width = Math.max(1, Math.round(element.videoWidth * ratio)); canvas.height = Math.max(1, Math.round(element.videoHeight * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) { setCameraError('Chưa chụp được hình. Hãy dùng camera của thiết bị.'); return; }
    ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!alive.current || cameraSeq !== cameraGeneration.current) return;
      if (blob) void selectImage(new File([blob], 'anh-chup-rac.png', {type: 'image/png'}));
      else setCameraError('Chưa chụp được ảnh. Hãy thử lại.');
    }, 'image/png');
  }
  async function recognize() {
    if (!image || !consent || !canRecognize || recognizing || processing || cameraState !== 'idle') return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const seq = ++generation.current; const timer = setTimeout(() => controller.abort(), 35000);
    setRecognizing(true); setCandidates([]); setError(''); setStatus('Đang nhận diện ảnh…');
    try {
      const result = await api<{status: string; candidates: Candidate[]}>('/api/recognize', {consent: true, image}, controller.signal);
      if (!alive.current || seq !== generation.current) return;
      setCandidates(result.candidates);
      setStatus(result.status === 'blurry' ? 'Ảnh chưa rõ. Hãy chụp gần hơn, đủ sáng và không rung.' : result.candidates.length ? 'Đã nhận diện. Chọn đúng vật để kiểm tra cách xử lý.' : 'Chưa xác định được vật trong ảnh. Thử ảnh khác hoặc tìm tên bên dưới.');
    } catch (e) {
      if (alive.current && seq === generation.current) { setStatus(''); setError(controller.signal.aborted ? 'Nhận diện quá lâu. Hãy thử lại hoặc tìm bằng tên.' : (e as Error).message); }
    } finally { clearTimeout(timer); if (alive.current && seq === generation.current) setRecognizing(false); }
  }
  function clearImage() { invalidate(); setProcessing(false); setImage(''); setFileName(''); setStatus(''); setError(''); setCandidates([]); setConsent(false); }
  const choices = manual.trim() ? searchItems(items, manual).slice(0, 5) : [];
  return <Dialog open={open} onOpenChange={next => {if (!next) close();}}>
    <DialogContent className="photo-dialog">
      <div className="photo-title"><span className="feature-icon"><ScanLine/></span><div><DialogTitle>Nhìn rõ món đồ. Bỏ đúng nơi.</DialogTitle><DialogDescription>Chụp hoặc chọn ảnh, rồi xác nhận vật cần phân loại.</DialogDescription></div></div>
      <input ref={fileInput} className="sr-only" tabIndex={-1} aria-label="Chọn ảnh từ thiết bị" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={e => {const file=e.currentTarget.files?.[0]; e.currentTarget.value=''; void selectImage(file);}}/>
      <input ref={nativeCamera} className="sr-only" tabIndex={-1} aria-label="Chụp bằng camera thiết bị" type="file" accept="image/*" capture="environment" onChange={e => {const file=e.currentTarget.files?.[0]; e.currentTarget.value=''; void selectImage(file);}}/>
      <div className="photo-actions"><button className="btn-outline" onClick={() => {invalidate(); setProcessing(false); void startCamera();}} disabled={cameraState === 'requesting'}><Camera/>{cameraState === 'requesting' ? 'Đang xin quyền…' : 'Mở camera'}</button><button className="btn-outline" onClick={() => fileInput.current?.click()}><ImagePlus/>Chọn ảnh</button></div>
      {cameraState !== 'idle' ? <div className="camera-stage">
        {cameraState === 'live' ? <><video ref={video} autoPlay playsInline muted onLoadedMetadata={() => setCameraReady(true)} aria-label="Hình ảnh từ camera"/><div className="camera-guides" aria-hidden="true"/><span className="camera-hint">Đặt một món đồ trong khung, giữ máy ổn định</span></> : <div className="camera-wait"><Loader2 className="spin"/><b>Cho phép sử dụng camera</b><p>Xác nhận yêu cầu của trình duyệt để bắt đầu.</p></div>}
        <button className="camera-dismiss icon-button" aria-label="Dừng camera" onClick={stop}><X/></button>
        {cameraState === 'live' && <button className="shutter" onClick={() => void capture()} disabled={!cameraReady} aria-label="Chụp ảnh ngay"><Camera/></button>}
      </div> : processing ? <div className="photo-loading" role="status"><Loader2 className="spin"/><b>Đang chuẩn bị ảnh…</b><span>Tối ưu kích thước ngay trên thiết bị</span></div> : image ? <div className="photo-preview"><img src={'data:image/png;base64,'+image} alt="Ảnh vật dụng bạn đã chọn"/><div className="photo-preview-caption"><span><CheckCircle2/>Ảnh đã được chọn</span><button className="icon-button" aria-label="Xóa ảnh đã chọn" onClick={clearImage}><Trash2/></button></div><span className="sr-only">{fileName}</span></div> : <button className={'photo-dropzone '+(dragging?'is-dragging':'')} onClick={() => fileInput.current?.click()} onDragOver={e => {e.preventDefault(); setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault(); setDragging(false); void selectImage(e.dataTransfer.files[0]);}}><span className="drop-icon"><Upload/></span><b>{dragging?'Thả ảnh vào đây':'Chọn ảnh hoặc kéo thả vào đây'}</b><span>JPEG, PNG, WebP · tối đa 15 MB</span><small>Nên chụp riêng từng món, rõ nét và đủ sáng</small></button>}
      {cameraError && <div className="notice warning" role="alert">{cameraError}</div>}
      {(cameraError || embedded) && <div className="device-alternatives"><button className="text-button" onClick={() => nativeCamera.current?.click()}><Camera/>Dùng camera của thiết bị</button><a className="text-button" href={siteUrl || '/'} target="_blank" rel="noopener noreferrer"><ExternalLink/>Mở website ở tab riêng</a></div>}
      {error && <div className="notice warning" role="alert">{error}</div>}
      {status && <p className="photo-status" role="status">{recognizing?<Loader2 className="spin"/>:<CheckCircle2/>}{status}</p>}
      {canRecognize ? image && cameraState === 'idle' && <div className="recognition-controls"><label className="consent"><input type="checkbox" checked={consent} disabled={recognizing} onChange={e => setConsent(e.target.checked)}/><span>Tôi đồng ý gửi ảnh đến dịch vụ AI để nhận diện. Xanh360 không lưu ảnh lâu dài.</span></label><button className="primary wide" onClick={() => void recognize()} disabled={!consent || recognizing || processing}>{recognizing?<Loader2 className="spin"/>:<ScanLine/>}{recognizing?'Đang nhận diện…':'Nhận diện ảnh'}</button>{candidates.map((c,i) => <button key={i} className="result-row" disabled={!catalogReady} onClick={() => {const item=items.find(x=>x.id===c.itemId); if(item) pick(item);}}><CheckCircle2/><b>{c.label}</b><span>Xem hướng dẫn</span></button>)}</div> : <div className="local-photo-note"><ShieldCheck/><div><b>Chụp và tải ảnh đã sẵn sàng</b><p>Nhận diện tự động chưa kết nối dịch vụ AI. Ảnh chỉ ở trên thiết bị; hãy nhập tên món đồ bên dưới để xem cách phân loại.</p></div></div>}
      <div className="photo-manual"><label htmlFor="photo-manual-search">{candidates.length ? 'Chưa đúng? Tìm lại tên vật' : 'Tìm tên vật để xem hướng dẫn'}</label><div className="searchbox compact"><Search/><input id="photo-manual-search" value={manual} onChange={e => setManual(composedValue(e))} maxLength={100} placeholder="Ví dụ: pin, ly nhựa, hộp giấy…"/></div>{choices.map(item => <button className="result-row" key={item.id} disabled={!catalogReady} onClick={() => pick(item)}><span><b>{item.name}</b><small>{item.material}</small></span><Search/></button>)}{manual.trim() && !choices.length && <p className="small">Chưa có vật này. Hãy thử tên gọi khác.</p>}</div>
      {image && <button className="text-button" onClick={() => {clearImage(); void startCamera();}}><RefreshCw/>Chụp lại ảnh khác</button>}
    </DialogContent>
  </Dialog>;
}
