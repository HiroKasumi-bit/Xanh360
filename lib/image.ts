// The server accepts only images re-encoded by a browser canvas: JPEG (what this app sends) or PNG (older clients).
// Both checks walk the container structure, enforce the size limits and drop metadata; neither decodes pixels.
export function sanitizePng(bytes:Uint8Array){if(bytes.length>1536*1024||bytes.length<33)throw new Error('Ảnh không hợp lệ hoặc quá lớn.');if([137,80,78,71,13,10,26,10].some((b,i)=>bytes[i]!==b))throw new Error('Định dạng ảnh không hợp lệ.');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const out:Uint8Array[]=[bytes.slice(0,8)];let offset=8,seenHeader=false,seenData=false,seenEnd=false;while(offset+12<=bytes.length){const len=view.getUint32(offset);if(len>bytes.length-offset-12)throw new Error('Ảnh bị hỏng.');const type=String.fromCharCode(...bytes.slice(offset+4,offset+8));if(!seenHeader&&type!=='IHDR')throw new Error('Thiếu thông tin ảnh.');if(type==='IHDR'){if(seenHeader||len!==13)throw new Error('Ảnh không hợp lệ.');const w=view.getUint32(offset+8),h=view.getUint32(offset+12);if(!w||!h||w*h>600000)throw new Error('Ảnh vượt giới hạn 0,6 triệu pixel.');if(bytes[offset+16]!==8||![2,6].includes(bytes[offset+17])||bytes[offset+18]||bytes[offset+19]||bytes[offset+20])throw new Error('Hãy chọn lại ảnh để chuẩn hóa.');seenHeader=true}if(type==='IDAT')seenData=true;if(['IHDR','IDAT','IEND'].includes(type))out.push(bytes.slice(offset,offset+len+12));if(type==='IEND'){if(len!==0)throw new Error('Ảnh không hợp lệ.');seenEnd=true;break}offset+=len+12}if(!seenHeader||!seenData||!seenEnd)throw new Error('Ảnh bị thiếu dữ liệu.');const result=new Uint8Array(out.reduce((n,x)=>n+x.length,0));let n=0;for(const part of out){result.set(part,n);n+=part.length}return result}
export function sanitizeJpeg(bytes:Uint8Array){
 if(bytes.length>1536*1024||bytes.length<4)throw new Error('Ảnh không hợp lệ hoặc quá lớn.');
 if(bytes[0]!==0xff||bytes[1]!==0xd8)throw new Error('Định dạng ảnh không hợp lệ.');
 const out:Uint8Array[]=[bytes.slice(0,2)];let offset=2,seenFrame=false;
 while(offset+4<=bytes.length){
  if(bytes[offset]!==0xff)throw new Error('Ảnh bị hỏng.');
  const marker=bytes[offset+1];
  if(marker===0xff){offset++;continue}
  const len=(bytes[offset+2]<<8)|bytes[offset+3];
  if(len<2||offset+2+len>bytes.length)throw new Error('Ảnh bị hỏng.');
  // Baseline, extended and progressive frames only; the frame size is checked against the same limit as PNG.
  if(marker>=0xc0&&marker<=0xcf&&![0xc4,0xc8,0xcc].includes(marker)){
   if(![0xc0,0xc1,0xc2].includes(marker)||seenFrame||len<8)throw new Error('Hãy chọn lại ảnh để chuẩn hóa.');
   const h=(bytes[offset+5]<<8)|bytes[offset+6],w=(bytes[offset+7]<<8)|bytes[offset+8];
   if(!w||!h||w*h>600000)throw new Error('Ảnh vượt giới hạn 0,6 triệu pixel.');
   seenFrame=true;
  }
  if(marker===0xda){
   // Start of scan: everything from here to the end-of-image marker is image data (and, for progressive JPEG, the
   // later scans' tables), copied as is.
   if(!seenFrame)throw new Error('Thiếu thông tin ảnh.');
   if(bytes[bytes.length-2]!==0xff||bytes[bytes.length-1]!==0xd9)throw new Error('Ảnh bị thiếu dữ liệu.');
   out.push(bytes.slice(offset));
   const result=new Uint8Array(out.reduce((n,x)=>n+x.length,0));let n=0;for(const part of out){result.set(part,n);n+=part.length}return result;
  }
  // APP1–APP15 (EXIF, XMP, ICC…) and comments are metadata: dropped.
  const metadata=(marker>=0xe1&&marker<=0xef)||marker===0xfe;
  if(!metadata)out.push(bytes.slice(offset,offset+2+len));
  offset+=2+len;
 }
 throw new Error('Ảnh bị thiếu dữ liệu.');
}
export function validateImageFile(file: Pick<File, 'type' | 'size' | 'name'>) {
 const supported = ['image/jpeg', 'image/png', 'image/webp'];
 const extension = /\.(jpe?g|png|webp)$/i.test(file.name);
 if ((!supported.includes(file.type) && !(file.type === '' && extension))) throw new Error('Định dạng chưa hỗ trợ. Hãy chọn JPEG, PNG hoặc WebP; với HEIC, hãy xuất ảnh sang JPEG.');
 if (!file.size) throw new Error('Tệp ảnh đang trống. Hãy chọn lại ảnh.');
 if (file.size > 15*1024*1024) throw new Error('Ảnh vượt quá 15 MB. Hãy chọn ảnh nhỏ hơn.');
}
async function decodeImage(file: File): Promise<{source: CanvasImageSource; width: number; height: number; close: () => void}> {
 if (typeof createImageBitmap === 'function') {
  try { const bitmap = await createImageBitmap(file); return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()}; } catch { /* Try the browser image decoder below. */ }
 }
 const url = URL.createObjectURL(file);
 try {
  const img = new Image();
  await new Promise<void>((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Xử lý ảnh quá lâu. Hãy chọn ảnh nhỏ hơn.')),15000);
   img.onload=()=>{clearTimeout(timer);resolve()};
   img.onerror=()=>{clearTimeout(timer);reject(new Error('Không đọc được ảnh này. Hãy chụp lại hoặc chọn một ảnh JPEG, PNG, WebP khác.'))};
   img.src=url;
  });
  return {source:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>URL.revokeObjectURL(url)};
 } catch(e) { URL.revokeObjectURL(url); throw e; }
}
// Photos are scaled to a 672px long edge: 2×2 of the vision model's 336px tiles, and small enough (~0.3-0.6 MB PNG) for
// the Worker to check and forward within the Workers Free CPU budget.
export const IMAGE_MAX_EDGE=672;
export async function prepareImage(file: File) {
 validateImageFile(file);
 const decoded = await decodeImage(file);
 try {
  if (!decoded.width || !decoded.height || decoded.width*decoded.height>48000000) throw new Error('Ảnh vượt giới hạn 48 triệu pixel hoặc bị lỗi. Hãy giảm độ phân giải rồi thử lại.');
  const ratio=Math.min(1,IMAGE_MAX_EDGE/Math.max(decoded.width,decoded.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(decoded.width*ratio));canvas.height=Math.max(1,Math.round(decoded.height*ratio));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Thiết bị chưa hỗ trợ xử lý ảnh.');
  // JPEG keeps a phone photo near 50-100 KB (PNG of camera noise runs to 1 MB+), so it uploads quickly on mobile data.
  // Transparent areas would turn black in JPEG; paint them white first.
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(decoded.source,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/jpeg',0.85);
  if(!data.startsWith('data:image/jpeg;base64,') || data.length>2*1024*1024)throw new Error('Ảnh quá lớn sau xử lý. Hãy chọn ảnh nhỏ hơn.');
  return data.split(',')[1];
 } finally { decoded.close(); }
}
