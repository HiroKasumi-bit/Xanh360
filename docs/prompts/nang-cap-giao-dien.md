# Prompt: Nâng cấp giao diện & hiệu ứng Xanh360 — đẹp hơn, chân thực hơn, sửa font

> Dùng nguyên văn prompt này cho AI/lập trình viên thực hiện. Chi tiết bằng chứng (ảnh chụp, số đo) nằm trong kết quả audit ngày 06/10/2026; prompt đã tổng hợp các quyết định từ đó.

## Bối cảnh

Xanh360 là web app tiếng Việt giúp phân loại rác tại TP.HCM: chụp/tải ảnh hoặc nhập tên → xác nhận vật và tình trạng → biết cách bỏ → tìm điểm tiếp nhận. Stack: Vinext (Next-compatible trên Vite), React 19, Tailwind 4, shadcn/ui, Cloudflare Workers + D1. Giao diện nằm ở `app/layout.tsx`, `app/globals.css`, `app/visuals.css`, `app/waste-app.tsx`, `app/eco-visual.tsx`, `app/photo-dialog.tsx`, `app/environment-panel.tsx`, `app/location-status.tsx`, `components/ui/*`.

Chủ website muốn: **giao diện đẹp hơn, hiệu ứng chân thực hơn** (có chiều sâu, ánh sáng và bóng đổ tự nhiên, chất liệu thật, chuyển động có trọng lượng), **sửa các lỗi font chữ**, và vẫn **dễ dùng trên điện thoại**.

## Ràng buộc không được phá

- Giữ thương hiệu Xanh360, toàn bộ dữ liệu, chức năng, API, luồng nghiệp vụ. Không tạo dữ liệu, địa điểm, số liệu giả. Không đổi ý nghĩa nội dung hướng dẫn.
- Chỉ rút gọn chữ khi cần để không bị cắt (ví dụ placeholder), giữ nguyên ý.
- Giữ và **làm đúng hơn**: giảm chuyển động (`prefers-reduced-motion` + nút "Dừng hiệu ứng"), thao tác bàn phím, nhãn/biểu tượng, màn hình nhỏ, cửa sổ cuộn được.
- Không xin camera/GPS tự động; không đụng logic ảnh/AI/định vị ngoài phần trình bày.
- `pnpm run typecheck`, `pnpm run test` (123 test), `pnpm run build` phải đạt sau thay đổi. CI dùng `pnpm install --frozen-lockfile`, nên lockfile phải được cập nhật bằng pnpm.

## Hướng thiết kế: "Lá & Giấy dưới nắng"

Chất liệu giấy tái chế ấm dưới nắng nhiệt đới, lá xanh sâu, một nguồn sáng chính.

- **Nền:** giấy ấm (`#f6f5ef`, bề mặt nổi `#fffdf8`) có hạt giấy (grain) rất nhẹ, dùng SVG noise làm lớp background, không phải lớp phủ fixed.
- **Hero:** rừng xanh sâu (`#0a2a22 → #0f3a2e`), **một** nguồn sáng chính từ trên phải, hiệu ứng nắng xuyên lá (dappled light, `mix-blend-mode: soft-light`). Kính mờ (frosted glass) chỉ dùng trên nền tối của hero.
- **Bảng màu:** gom ~15 sắc xanh về một thang 9 bậc. Màu phụ (lilac/peach/sky) không gán theo vị trí `nth-child` nữa mà theo **ngữ nghĩa** (tái chế, hữu cơ, nguy hại, thu gom riêng...). Rác nguy hại dùng tông hổ phách/đỏ đất có độ tương phản đạt chuẩn, không dùng xanh thương hiệu cho cảnh báo.
- **Độ sâu:** hệ token bóng đổ 2 lớp (key light sắc + ambient mềm) nhuộm xanh, ví dụ:
  - `--elev-1: 0 1px 1px rgb(16 58 42/.06), 0 2px 6px -1px rgb(16 58 42/.08)`
  - `--elev-2`, `--elev-3` tăng dần; `--elev-pressed` cho trạng thái nhấn.
  - Thêm viền sáng trên (`inset 0 1px 0 #fff9`) cho bề mặt nổi.
  - Bỏ bóng "plinth" lệch cứng của logo.
- **Bỏ các chi tiết clip-art kiểu "template AI":** vòng tròn 22px ở capture card, sheen quét, blob góc item card, icon tam giác cảnh báo trên đồ thường ngày (chỉ dùng cho vật nguy hại thật).

## Hạng mục thực hiện

### A. Font & chữ (ưu tiên cao nhất)

1. **Nạp Be Vietnam Pro** (OFL, thiết kế cho dấu tiếng Việt chồng tầng):
   - Cài `@fontsource/be-vietnam-pro@5.3.0`, ghim đúng phiên bản. Bản này qua được `minimumReleaseAge` 7 ngày trong `pnpm-workspace.yaml`.
   - Trong `app/layout.tsx`, chỉ import subset `latin-{400,500,600,700,800}.css` và `vietnamese-{400,500,600,700,800}.css`. **Không** import `index.css` hay `latin-ext`.
   - Không dùng `next/font/google` với vinext beta: khi build không có mạng, nó âm thầm hỏng.
2. **Font dự phòng khớp số đo** để tránh nhảy layout:
   `@font-face{font-family:'Be Vietnam Pro Fallback';src:local('Arial'),local('ArialMT'),local('Liberation Sans'),local('Arimo');ascent-override:90.61%;descent-override:24.01%;line-gap-override:0%;size-adjust:110.36%}`.
   Đặt `--font-sans:'Be Vietnam Pro','Be Vietnam Pro Fallback',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`. Xóa mọi khai báo Arial trùng lặp (3 chỗ).
3. **Thang chữ thống nhất** bằng token trên `:root` (rem, `clamp()`). Hiện có 30 cỡ chữ và h1 hero bị định nghĩa 7 lần; thay bằng:
   - Display (hero h1): `clamp(2rem,1.3rem+3.1vw,3.5rem)`, 800, line-height 1.15, tracking −0.025em.
   - h1: `clamp(1.75rem,1.45rem+1.3vw,2.5rem)`, 700.
   - h2: `clamp(1.25rem,1.12rem+.55vw,1.5rem)`, 700.
   - h3: 600.
   - Body: 16px/1.6. UI (nút/tab): 600. Meta/chip: 500.
   - Dùng `text-wrap:balance` cho tiêu đề, `text-wrap:pretty` cho đoạn văn.
4. **Sửa h1/h2 đang hiện độ đậm 400** do Tailwind preflight reset. Tiêu đề kết quả phải đậm hơn tiêu đề phụ "Bỏ ở đâu?".
5. **Sàn cỡ chữ:**
   - Tối thiểu 12px cho mọi chữ đọc được. 11px chỉ dành cho nhãn chữ hoa đậm 600.
   - Bỏ toàn bộ chữ 4.5–9px (eyebrow, scene-caption, floating-label, hero-meta, motion-control...). Cho xuống dòng thay vì `nowrap` + thu nhỏ.
   - Chữ hoa giãn cách: tracking ≤ 0.08em, line-height ≥ 1.3, để dấu tiếng Việt không dính.
6. **Đưa CSS phần tử vào `@layer base`** (body, h1–h3, p, a, `button/input{font:inherit}`), để utility của shadcn (`text-sm`, `font-medium`...) hoạt động lại.
7. **Các lỗi chữ nhỏ:**
   - Placeholder tìm kiếm bị cắt: đổi thành "Tên món đồ, ví dụ: pin cũ" hoặc tương đương.
   - Input < 16px trên iOS gây zoom: đặt 16px.
   - `—°C` trông như số âm: khi trống, hiện "Chưa có dữ liệu", không ghép đơn vị.
   - Số dùng `font-variant-numeric: tabular-nums` ở nơi cần thẳng cột. Be Vietnam Pro bản fontsource không có tabular, nên chỉ dùng ở chỗ thật cần.
   - Icon "mở liên kết" không được rơi xuống dòng riêng.
   - Gradient text ở hero dùng `display:inline-block` + padding để không cắt dấu.

### B. Lỗi CSS/giao diện phải sửa

- Class `.outline` trùng utility `outline` của Tailwind 4, làm nút viền có khung tối. Đổi tên (ví dụ `.btn-outline`) và cập nhật mọi chỗ dùng.
- Danh sách phường trong hộp chọn khu vực bị căn phải (`.area-option svg:last-child{margin-left:auto}`). Sửa để tên luôn căn trái, dấu ✓ ở phải.
- Ô tìm kiếm khi focus hiện 3 vòng viền chồng nhau. Chỉ giữ 1 vòng focus rõ ràng.
- Dialog shadcn:
  - Viền tối `currentColor` và nền phủ đen trung tính: đổi sang nền phủ xanh đậm `rgb(6 30 22/.45)` có blur nhẹ, viền nhạt, bóng `--elev-3`.
  - Nút đóng ghi "Close": đổi thành "Đóng", vùng bấm ≥ 44px.
  - Nút đóng phải luôn thấy khi nội dung cuộn.
- Dialog góp ý không cuộn được, tràn màn hình thấp: thêm cuộn.
- Margin toàn cục của h2/p phá nhịp khoảng cách trong dialog: chỉnh lại.
- "Xóa lịch sử" là hành động phá hủy nhưng đang tô xanh chính: dùng kiểu destructive.
- Kết quả rác nguy hại trông "bình thản" (badge xám "unknown", chữ khẩn cấp màu xanh): làm nổi bật bằng tông cảnh báo.
- Dọn CSS trùng: các block `@media(max-width:640px)` lặp 3 lần, `@keyframes card-sheen` trùng, block reduced-motion lặp 3 lần, CSS chết. Viết lại `globals.css`/`visuals.css` thành dạng đọc được, chia theo thành phần (một khai báo mỗi dòng).

### C. Chân thực & thẩm mỹ

- **Quả cầu hero tin được:**
  - Ánh sáng (glint, vùng tối terminator) đứng yên trên lớp ngoài; chỉ bề mặt xoay chậm (60–90s).
  - Có bóng tiếp xúc hình elip bên dưới, co lại và nhạt đi khi quả cầu nổi lên.
  - Vật thể nhấp nhô nhưng không xoay lắc.
  - Các nhãn nổi là kính mờ thật (`backdrop-filter`, viền sáng trên, bóng mềm), không xoay nghiêng, chuyển động lệch pha nhau, không đè lên quả cầu. Thay icon pin gây hiểu nhầm.
- **Thẻ hành động** (Chụp ảnh / Tải ảnh / Nhập tên) và **thẻ vật dụng:** bề mặt giấy có bóng 2 lớp. Hover nâng 2px (chỉ trên thiết bị có hover), nhấn lún `scale(.97)` + `--elev-pressed`.
- **Thanh tab:** khay lõm (`inset` shadow) với **pill trượt** sang tab đang chọn.
- **Biển phân loại (WasteSign):** giống nhãn dán thùng rác thật, có dải màu theo loại ở cạnh trái và icon dập nổi.
- **Danh sách bước** trong thẻ kết quả: số thứ tự rõ, có đường nối, không còn là chữ trơn.
- **Widget thời tiết:**
  - Thu gọn thành "chip thành phố" một dòng (nhiệt độ · badge AQI đúng màu mức · nút làm mới · mũi tên mở chi tiết).
  - Trạng thái trống chỉ 1 dòng + nút "Thử lại" hoạt động trên mọi kích thước. Hiện có 4 thông báo trống và header cao 225px.
- **Độ tương phản:** mọi chữ phụ trên thẻ/chip/dialog đạt WCAG AA (≥ 4.5:1 với chữ thường).

### D. Điện thoại & responsive (360 / 390 / 414 / 768 / 1366)

- **Không** có cuộn ngang trang. Thanh tab không tràn, "Lịch sử" không bị cắt. Đề xuất: ≤ 640px dùng **thanh tab dưới đáy** (4 cột, icon trên nhãn 12px, cao 56px + `env(safe-area-inset-bottom)`, kính mờ), vẫn giữ đúng semantics Tabs và bàn phím.
- **Header gọn** (~80px): logo trái; chip vị trí + chip thời tiết phải. Nút "Dừng hiệu ứng" không chiếm nguyên một dòng riêng trên mobile.
- **Hero trên mobile:** quả cầu là vật thể sắc nét 150–170px ở góc, không phải "bóng ma" 22% đè sau tiêu đề. Hành động chính phải thấy sớm hơn, không bị đẩy xuống ~600px.
- **Capture cards dưới 420px:** "Chụp ảnh" thành hàng chính full-width 64px; "Tải ảnh"/"Nhập tên" là 2 thẻ nửa chiều rộng. Không còn chữ mồ côi 3 dòng.
- **Bộ lọc điểm tiếp nhận** trên mobile: 1 cột (không còn select 2 dòng căn giữa). Trên desktop có thể sticky.
- **Dialog ≤ 640px dạng bottom sheet:** bo góc trên 24px, thanh kéo 36×4px, header sticky có nút đóng 44px, một vùng cuộn duy nhất, `max-height: calc(100dvh - 24px)`, hỗ trợ safe-area. Desktop giữ dialog giữa màn hình.
- **Các chi tiết khác:**
  - Vùng bấm ≥ 44px.
  - Hover chỉ áp dụng trong `@media (hover:hover) and (pointer:fine)` để không bị "kẹt hover" sau khi chạm.
  - Thêm `viewport` export với `viewport-fit=cover` và theme color.
  - Camera: gợi ý và nút chụp không đè khung ngắm; nút chụp không ra ngoài màn hình khi xoay ngang.

### E. Chuyển động & trợ năng

- **Token chuyển động** trên `:root`:
  - Thời lượng: `--dur-instant:90ms`, `--dur-fast:140ms`, `--dur-base:220ms`, `--dur-slow:320ms`.
  - Easing: `--ease-out:cubic-bezier(.2,.8,.2,1)`, `--ease-spring` (overshoot nhẹ), `--ease-press`.
  - Chỉ animate `transform`/`opacity`. Không animate `box-shadow`/`filter`/kích thước; với bóng đổ, fade `opacity` của lớp `::after`.
- **Một nguồn sự thật cho giảm chuyển động:**
  - Script inline trong `<head>` (layout) đặt `html[data-motion=reduced|full]` từ localStorage + `matchMedia` **trước lần vẽ đầu**. Hiện có chớp hiệu ứng ~750ms rồi mới dừng.
  - CSS đọc `[data-motion=reduced]` thay cho 3 block lặp.
  - Spinner đang tải vẫn được quay (là thông tin, không phải trang trí).
  - Nút "Dừng hiệu ứng / Bật hiệu ứng" dùng `aria-pressed` nhất quán, cỡ chữ ≥ 12px, không biến thành nút disabled khó hiểu khi hệ thống đã bật giảm chuyển động (giải thích bằng nhãn).
  - Tắt vòng lặp trang trí khi hero ra khỏi màn hình (IntersectionObserver) và trên mobile nếu tốn GPU.
- **Vi tương tác:**
  - Nhấn lún cho mọi thứ bấm được.
  - Hover tint + mũi tên nhích 3px cho hàng kết quả.
  - Kết quả tìm kiếm hiện dần lệch nhịp 30ms (tối đa 8 hàng).
  - Lựa chọn Có/Không giữ trạng thái nhấn (`aria-pressed`) và hiện spinner trong nút khi đang xử lý.
  - Kết quả phân loại: skeleton giữ chỗ (`components/ui/skeleton.tsx`), rồi nội dung fade + nhô 8px; không nhảy kích thước, cuộn tới kết quả mượt.
  - Sửa lỗi hover lift của item card bị `animation-fill-mode: both` chặn.
- **Focus & bàn phím:**
  - Vòng focus rõ: 2.5px `#1d7a55`, offset 2px, quầng trắng; trên nền tối dùng `#d7f79b`. Dùng vòng inset trong vùng cuộn để không bị cắt. Hiện vòng focus chỉ đạt 1.70:1.
  - Trả focus về nút mở sau khi đóng mọi dialog có điều khiển (vị trí, góp ý, chi tiết điểm, ảnh).
  - Sau khi chọn một hàng kết quả hoặc trả lời Có/Không, chuyển focus tới vùng kết quả/câu hỏi tiếp theo.
  - Tab panel hoặc có focus nhìn thấy được, hoặc không là điểm Tab.
  - Thu hẹp `aria-live` chỉ cho thông báo trạng thái, không bọc cả khối kết quả.

## Kiểm tra bắt buộc trước khi xong

1. `pnpm run typecheck`, `pnpm run test`, `pnpm run build` đều đạt. `pnpm run lint` không thêm lỗi mới so với trước.
2. Chạy bản build (`pnpm run start`) và chụp ảnh Playwright ở 360, 390, 414, 768, 1366 cho:
   - trang chủ;
   - kết quả tìm "pin" và "nhiệt kế";
   - luồng nhiệt kế vỡ;
   - các tab Điểm tiếp nhận, Danh mục, Lịch sử;
   - các hộp chọn khu vực, ảnh, góp ý;
   - chế độ giảm chuyển động.
3. Tự động khẳng định trên mỗi độ rộng:
   - `scrollWidth == clientWidth` (không cuộn ngang);
   - `.nav-tabs` không tràn;
   - không có chữ hiển thị < 12px (trừ nhãn 11px được phép);
   - `document.fonts.check('600 16px "Be Vietnam Pro"')` đúng;
   - vùng bấm chính ≥ 44px.
4. So sánh ảnh trước/sau. Ghi rõ những gì chưa kiểm được (camera/GPS thật, Safari iOS thật).
