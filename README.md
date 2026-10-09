# Xanh360

Ứng dụng tiếng Việt hỗ trợ phân loại, hướng dẫn bỏ rác và tìm điểm tiếp nhận tại TP. Hồ Chí Minh theo danh mục hành chính có nguồn.

> Tài liệu bàn giao mới nhất nằm trong [`docs/ban-giao/`](docs/ban-giao/BAT_DAU_O_DAY.md). Một số số liệu bên dưới (48 vật dụng, trạng thái riêng tư...) đã cũ.

## Deploy lên Cloudflare

Repo tự build và deploy lên Cloudflare Workers + D1 mỗi khi có commit vào nhánh `main` (xem `.github/workflows/deploy.yml`). Pull request chỉ chạy typecheck, test và build.

Thiết lập một lần:

1. Tạo tài khoản Cloudflare (gói Free là đủ để bắt đầu).
2. Tạo database D1 tên `xanh360-db`: vào **Storage & Databases → D1 → Create**, hoặc chạy `npx wrangler d1 create xanh360-db`. Ghi lại **Database ID**.
3. Tạo API token: **My Profile → API Tokens → Create Token → mẫu "Edit Cloudflare Workers"**, thêm quyền **Account → D1 → Edit**.
4. Lấy **Account ID** ở trang Workers & Pages (cột bên phải).
5. Trong GitHub repo, vào **Settings → Secrets and variables → Actions**:
   - Tab *Secrets*: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
   - Tab *Variables*: `D1_DATABASE_ID`.
6. Chạy lại workflow (**Actions → Kiểm tra và deploy lên Cloudflare → Run workflow**). Workflow áp dụng migration trong `drizzle/` rồi deploy Worker tên `xanh360`. Website có địa chỉ `https://xanh360.<tên-tài-khoản>.workers.dev`; có thể gắn tên miền riêng trong **Workers → xanh360 → Settings → Domains & Routes**.

Nhận diện ảnh dùng Workers AI miễn phí, không cần cấu hình thêm (xem mục "Nhận diện ảnh"). Biến tùy chọn (`VISION_ENDPOINT`, `VISION_API_KEY` cho adapter riêng, `ADMIN_EMAILS`) đặt ở **Workers → xanh360 → Settings → Variables and Secrets**, chọn loại *Secret* để lần deploy sau không xóa mất.

**Quản trị:** trang `/admin` dựa vào đăng nhập ChatGPT do Sites cung cấp. Trên Cloudflare không có lớp đăng nhập này, nên Worker bỏ qua các header `oai-authenticated-user-*` do khách gửi và trang quản trị luôn yêu cầu đăng nhập (không ai vào được). Muốn dùng quản trị trên Cloudflare cần thêm cơ chế xác thực riêng, ví dụ Cloudflare Access. Chỉ đặt `TRUST_PLATFORM_AUTH_HEADERS=true` khi chạy sau một proxy đáng tin tự gắn các header đó (như ChatGPT Sites).

Dữ liệu D1 trên website Sites cũ (bản ghi đã xuất bản, phản hồi, audit) không được chuyển sang; website mới bắt đầu với danh mục nền trong `lib/seed.ts` và `lib/catalog-expansion.ts`.

## Kiến trúc

Môi trường Sites chạy Cloudflare Workers, vì vậy dự án giữ Next-compatible Vinext + React/TypeScript + Tailwind, dùng D1/Drizzle thay PostgreSQL/Prisma. D1 lưu thay đổi nội dung, bản nháp, phản hồi, phiên bản/audit và giới hạn yêu cầu. Không dùng browser storage làm cơ sở dữ liệu nghiệp vụ. Lịch sử tra cứu chỉ lưu trên thiết bị theo đặc tả.

- `lib/domain.ts`: bộ quy tắc, tìm tên, xác định điểm phù hợp, đường chim bay và Maps URLs.
- `lib/seed.ts`: dữ liệu khởi tạo có nguồn; 48 vật dụng, hướng dẫn chung, 4 địa chỉ chương trình VNTC công bố.
- `lib/areas.json`: 168 đơn vị hành chính và ánh xạ tên cũ có căn cứ ở một số khu vực. ID là mã nội bộ, không phải mã hành chính chính thức.
- `lib/repository.ts`: danh mục nền chỉ đọc + thay đổi được xuất bản trong D1. Không tự tạo schema lúc chạy.
- `db/schema.ts`, `drizzle/`: schema và migration.
- `app/api`: validate Zod, phân quyền server, phản hồi, quản trị, nhận diện tùy chọn.
- `app/admin`: biên tập có nháp, xuất bản, kiểm tra chồng lấn, thử quy tắc và khôi phục nháp từ lịch sử.

Các thực thể vật dụng/tên gọi/vật liệu, nguồn, khu vực, quy tắc, điểm và khả năng tiếp nhận được lưu thành các tài liệu có schema Zod trong bảng `records` theo `(kind,id)`. Đây là mô hình lưu trữ gọn cho bản đầu; liên kết kiểm tra ở tầng nghiệp vụ. Quản trị viên được định danh bởi nền tảng và kiểm tra allowlist server, không có mật khẩu nội bộ.

## Chạy

Yêu cầu Node 22.13+ và pnpm theo `packageManager`.

```sh
pnpm install --frozen-lockfile
pnpm run db:generate
pnpm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_worried_puma.sql
pnpm run dev
```

Chỉ chạy migration một lần trên mỗi cơ sở dữ liệu. Sites tự áp dụng migration production khi xuất bản. Trong môi trường managed, dùng `sites-preview start "$PWD"` thay lệnh dev trực tiếp.

Danh mục seed được nạp từ `lib/seed.ts` và hợp nhất với phiên bản xuất bản trong D1. Seed không ghi đè chỉnh sửa. Không chèn dữ liệu demo vào production. Khi cập nhật seed sau này, rà soát các bản ghi đã override để tránh quy tắc cũ tồn tại ngoài ý muốn.

## Quản trị

Điền `ADMIN_EMAILS` bằng email quản trị được phép, phân tách dấu phẩy, trong môi trường runtime Sites hoặc `.dev.vars` khi phát triển. Trang `/admin` dùng đăng nhập ChatGPT ở cấp nền tảng. API kiểm tra lại danh tính và allowlist mỗi yêu cầu. Người đăng nhập khác không có quyền quản trị. Không giả lập header danh tính trên một máy chủ được mở ra Internet.

Nháp chỉ lưu ở `drafts`, không ảnh hưởng tra cứu. Xuất bản dùng kiểm tra phiên bản để tránh ghi đè người khác, cùng nhật ký before/after. Khôi phục tạo nháp để rà soát trước khi xuất bản lại. Chỉ quản trị viên có thể nhập nguồn mới, đánh dấu xác nhận trực tiếp và xuất bản.

## Nhận diện ảnh

Khi deploy lên Cloudflare, ảnh được nhận diện bằng **Cloudflare Workers AI** (model `@cf/meta/llama-4-scout-17b-16e-instruct`, binding `AI` khai báo trong `vite.config.ts`, mã ở `lib/vision.ts`). Không cần API key. Gói Workers Free có hạn mức miễn phí mỗi ngày (reset 00:00 UTC, tức 7 giờ sáng giờ Việt Nam); hết hạn mức thì yêu cầu bị từ chối chứ không tính tiền, và app báo người dùng tra cứu bằng tên. Nếu nâng lên gói Workers Paid, phần vượt hạn mức sẽ tính phí theo Neurons, nên cần đặt giới hạn trước.

- Ảnh chỉ được gửi khi người dùng tích đồng ý và bấm "Nhận diện ảnh"; không lưu ảnh.
- Mô hình chỉ chọn món trong danh mục (gửi kèm `id: tên` các vật dụng đang hoạt động). ID không có trong danh mục bị loại; hướng dẫn xử lý và điểm tiếp nhận luôn lấy từ quy tắc có nguồn.
- Giới hạn 10 lần/IP/giờ và tổng cộng 100 lần/ngày cho cả website (đặt biến `IMAGE_DAILY_LIMIT` để đổi), timeout 25 giây. Mỗi lần dùng khoảng 60–90 Neurons, nên 100 lần nằm trong hạn mức miễn phí 10.000 Neurons/ngày.
- Ảnh được thu về cạnh dài 672px trên thiết bị trước khi gửi, để Worker xử lý trong giới hạn CPU khoảng 10 ms của gói Free.
- Nếu bước deploy báo `Authentication error` sau khi thêm AI, thêm quyền **Account → Workers AI → Read** cho API token.
- Khi chạy cục bộ (`pnpm run start`), Workers AI cần đăng nhập Cloudflare; không có thì nút nhận diện báo lỗi và tra cứu tên vẫn hoạt động.

### Adapter HTTPS riêng (tùy chọn)

Nếu cấu hình `VISION_ENDPOINT` (HTTPS do người vận hành tin cậy) và `VISION_API_KEY`, app dùng adapter này thay cho Workers AI. Adapter phải nhận JSON:

```json
{"image":"BASE64_PNG","mimeType":"image/png","catalog":[{"id":"pin-aa","name":"Pin AA / AAA"}],"instruction":"..."}
```

Trả JSON:

```json
{"status":"ok","candidates":[{"itemId":"pin-aa","label":"Pin tiểu"}]}
```

`status` chỉ `ok`, `blurry`, `empty`. Tối đa 8 candidates. Chỉ itemId tồn tại được dùng. Không chấp nhận hướng dẫn xử lý hoặc URL từ mô hình. Kết nối nhà cung cấp AI cụ thể cần một adapter theo hợp đồng này; chưa kiểm thử với dịch vụ thật. Timeout 25 giây, tối đa 10 yêu cầu/IP/giờ. Cần bổ sung quota tổng nhà cung cấp trước khi mở công khai quy mô lớn.

Browser giải mã JPEG/PNG/WebP, giới hạn 15 MB và 48 triệu pixel đầu vào, resize về cạnh dài 672px và xuất PNG để loại metadata. Server chỉ chấp nhận PNG cấu trúc được hỗ trợ, tối đa 0,6 triệu pixel và 1,5 MB, loại ancillary chunks. Không lưu file/R2. Bộ kiểm tra PNG hiện kiểm tra cấu trúc và kích thước, chưa thay thế bộ giải mã ảnh đầy đủ; cần harden thêm trước khi bật dịch vụ công khai.

## Google Maps và vị trí

Maps URLs mở chỉ đường bằng địa chỉ/Place ID/tọa độ, không cần key. Không truyền vị trí vào URL backend dạng query; tọa độ gửi POST để tìm điểm và không lưu. Khoảng cách là Haversine, luôn ghi đường chim bay.

Bốn điểm ban đầu có nguồn địa chỉ nhưng chưa có tọa độ kiểm chứng: không được gán khoảng cách hay khẳng định gần nhất. Mục điểm có nguồn công bố luôn yêu cầu liên hệ xác nhận. Chưa có địa điểm xác nhận trực tiếp. Điểm An Phú có tên khu vực trong nguồn chưa chuẩn hóa chắc chắn nên chỉ đưa vào toàn TP.HCM, không ánh xạ sang phường trùng tên.

Luồng điểm tiếp nhận chưa tích hợp geocoding, tìm kiếm Places, Routes hoặc polygon ranh giới. `GOOGLE_MAPS_API_KEY` là khóa dự phòng, chưa kích hoạt các dịch vụ đó. Phạm vi điểm được xét theo khu vực có nguồn trong danh mục, không theo chữ TP.HCM trong địa chỉ. Vị trí người dùng chưa được đối chiếu ranh giới, UI nói rõ. Không biến nhập địa chỉ thành tọa độ giả.

Nguồn kỹ thuật EPA chỉ hỗ trợ hướng dẫn chung; chưa có bộ quy tắc thu gom riêng từng phường/xã. Những vật thiếu căn cứ trả chưa xác định. Nhóm thu gom là nhóm hướng dẫn sản phẩm, không khẳng định là phân nhóm pháp luật.

## Kiểm tra

```sh
pnpm run typecheck
pnpm run lint
pnpm run test
TEST_BASE_URL=http://127.0.0.1:4173 pnpm run test:e2e
```

Không chạy E2E có ghi dữ liệu vào production. Xem `VALIDATION.md` để phân biệt các bước đã chạy và chưa chạy.

## Nguồn

Nguồn và ngày kiểm tra nằm trong `lib/seed.ts`, hiển thị trong kết quả và quản trị. Danh mục khu vực đối chiếu bài công bố Nghị quyết 1685/NQ-UBTVQH15 trên Cổng thông tin Chính phủ ngày kiểm tra 2026-10-04. Đây là snapshot có nguồn, cần rà soát định kỳ khi quy định thay đổi. Không tự khẳng định mọi địa chỉ chương trình đang hoạt động.

## Giới hạn bản đầu

- Chưa có quy tắc thu gom riêng từng phường/xã hoặc nguồn pháp lý mới hơn được tự đồng bộ.
- Chưa có tọa độ, lịch hay xác nhận trực tiếp của các điểm.
- Nhận diện ảnh dùng Workers AI miễn phí; độ chính xác với ảnh thật chưa được kiểm thử trên tài khoản Cloudflare thật.
- Chưa có polygon kiểm tra vị trí hoặc Google Maps API.
- Một số tên cũ có ánh xạ, chưa phải bộ chuyển đổi toàn bộ địa chỉ.
- Bản riêng tư để chủ sở hữu kiểm tra; chưa mở công khai và chưa được chứng nhận sẵn sàng production.


## Không khí và thời tiết (Xanh360)

- POST `/api/environment` nhận tọa độ đã làm tròn 2 chữ số; gọi Open-Meteo weather và CAMS global song song, xử lý lỗi từng nguồn độc lập.
- POST `/api/environment/location` tìm địa danh Việt Nam qua Open-Meteo/GeoNames; tên nhà cung cấp có thể chưa phản ánh địa giới mới. Không tái sử dụng các tên này làm dữ liệu hành chính phân loại rác.
- Không xin GPS khi mở ứng dụng; chỉ khi bấm nút. Không lưu lịch sử tọa độ. Cache trong bộ nhớ tiến trình tối đa 200 ô và 10 phút; không lưu cơ sở dữ liệu.
- Rate limit: 60 yêu cầu điều kiện và 30 yêu cầu địa danh mỗi giờ/IP băm. Không ghi tọa độ vào log ứng dụng. Nhà cung cấp có chính sách lưu log riêng được liên kết trong UI.
- US AQI là giá trị nhà cung cấp, không tự suy ra từ PM2.5 tức thời; không phải VN_AQI. CAMS toàn cầu có lưới khoảng 45 km, không phải trạm gần nhất. Có timestamp và nhãn quá hạn sau 3 giờ.
- Không cần API key với dịch vụ Open-Meteo miễn phí cho bản cá nhân phi thương mại hiện tại. Nếu đưa vào sản phẩm thương mại/quảng cáo, cần chuyển gói nhà cung cấp phù hợp. Hạn mức miễn phí hiện hành: dưới 10.000/ngày, 5.000/giờ, 600/phút; cần giới hạn tổng và cache phân tán nếu mở rộng người dùng.
- Nguồn triển khai: https://open-meteo.com/en/docs ; https://open-meteo.com/en/docs/air-quality-api ; https://open-meteo.com/en/docs/geocoding-api ; https://open-meteo.com/en/terms .


### Hiển thị nhanh toàn TP.HCM
Widget trên header tự gọi GET `/api/environment/city`, không GPS hoặc chọn khu vực. Năm điểm tham chiếu địa lý gần trung tâm, Thủ Dầu Một, Vũng Tàu, Cần Giờ, Côn Đảo; không phải tọa độ trạm đo hoặc tâm hành chính. Khoảng nhiệt độ/AQI lấy min-max các điểm có dữ liệu trong 3 giờ, không phải trung bình toàn thành phố. Chi tiết thể hiện dữ liệu thiếu, nguồn và thời gian từng điểm. Server gộp yêu cầu đồng thời, cache 10 phút (1 phút khi thiếu); client cập nhật mỗi 10 phút nếu tab hiển thị. Trang môi trường riêng được thay bằng widget, API tìm theo vị trí còn giữ để tương thích.


## Nâng cấp thao tác ảnh và vị trí — 06/10/2026

- `app/photo-dialog.tsx`: chọn/kéo thả ảnh, chuẩn hóa và xem trước hoàn toàn trên thiết bị, camera trực tiếp và phương án camera thiết bị. Tải ảnh không phụ thuộc vào `VISION_ENDPOINT`/`VISION_API_KEY`. Chỉ gửi ảnh khi đủ cấu hình, đã đồng ý và bấm Nhận diện ảnh.
- Camera dùng HTTPS và quyền trình duyệt; yêu cầu camera sau dưới dạng ưu tiên, không ép thiết bị. Track được dừng khi đóng hộp thoại, tab bị ẩn, dùng ảnh hoặc yêu cầu đã hết hiệu lực. Ảnh xem trước bị xóa khi đóng hộp thoại.
- `hooks/use-location.ts` và `lib/device-access.ts`: xin vị trí theo thao tác bấm, báo lỗi theo quyền/tín hiệu/timeout, bỏ qua kết quả muộn sau hủy. Tọa độ và độ chính xác chỉ ở bộ nhớ trang; API điểm tiếp nhận nhận vị trí nhưng không lưu. Mở Maps là thao tác do người dùng chủ động.
- `app/location-status.tsx`: hiển thị vị trí, độ chính xác ước tính, xóa vị trí và mở tab riêng nếu khung nhúng hạn chế quyền. Không vượt quyền của trình duyệt/khung cha. Chọn khu vực thủ công xóa tọa độ cũ và đặt lại phạm vi toàn khu vực.
- Bộ giải mã ảnh có fallback HTMLImageElement cho trình duyệt không giải mã được bằng createImageBitmap. HEIC chưa hỗ trợ trực tiếp; UI hướng dẫn xuất JPEG.
- Giao diện mới giữ tra cứu tên, nguồn hướng dẫn, phản hồi, lịch sử cục bộ, điểm tiếp nhận, quản trị và widget môi trường. Không thay schema hoặc danh mục dữ liệu.
- Cấu hình còn thiếu: `ADMIN_EMAILS` nếu cần quyền quản trị. Không có khóa dịch vụ mới hoặc mua dịch vụ trong đợt nâng cấp này.
