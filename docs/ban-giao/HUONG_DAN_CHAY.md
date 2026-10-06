# Chạy và tiếp tục phát triển Xanh360

## 1. Yêu cầu môi trường

- Mở terminal trong thư mục `project/`.
- Node.js **22.13.0 trở lên** theo package.json.
- **pnpm 11.25.0** theo trường packageManager. Giữ nguyên pnpm-lock.yaml; không đổi sang npm/yarn chỉ để tránh lỗi cài đặt.
- Kết nối tải package khi cài lần đầu. Không kèm node_modules hoặc build trong ZIP.
- Đây là Vinext + Cloudflare Workers/D1. Không dùng lệnh Next thuần hoặc mặc định một nền tảng chỉ phục vụ file tĩnh.

Tệp `.sites-runtime/execution-profile.json` là trạng thái riêng của máy cũ và không được xuất. Khi không có tệp này, scripts/execution-profile.mjs chọn chế độ **portable**. scripts/run-framework.mjs dùng Vinext CLI cho dev/build ở chế độ đó. Các lệnh dưới đây được đối chiếu với mã nguồn; chưa được thử lại trên máy và hệ điều hành của người nhận.

## 2. Cài và kiểm tra nhanh

Sau khi đã cài đúng phiên bản Node/pnpm:

```sh
cd project
pnpm --version
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm run build
```

Vitest dùng môi trường kiểm thử riêng, không cần kết nối database production. pnpm run build tạo cấu hình Worker ở dist/server/wrangler.json.

Không cần chạy `pnpm run db:generate` để khởi động lần đầu: migration đã có trong `drizzle/`. Lệnh generate chỉ dùng khi thay đổi schema có chủ đích.

## 3. Cấu hình môi trường cục bộ

Nếu chưa có `.dev.vars`, sao chép `.env.example` thành `.dev.vars` và điền giá trị cần thiết. Không ghi đè tệp cấu hình đã có của người nhận. Không commit/upload khóa thật cùng mã nguồn.

| Biến/binding | Khi cần | Trạng thái |
| --- | --- | --- |
| DB | Database D1 cho catalog/API/admin/rate limit | Binding khai báo ở .openai/hosting.json và cấu hình Vite |
| VISION_ENDPOINT | HTTPS adapter nhận diện | Chưa cấu hình trong bản được bàn giao |
| VISION_API_KEY | Bearer credential cho adapter | Không có trong ZIP |
| ADMIN_EMAILS | Danh sách email quản trị, cách nhau bằng dấu phẩy | Chưa cấu hình ở lần phát triển cuối |
| GOOGLE_MAPS_API_KEY | Adapter bản đồ tương lai | Hiện chưa được dùng; Maps URL không cần key |

Tra cứu thủ công và xử lý ảnh cục bộ vẫn có thể hoạt động khi thiếu cấu hình AI. Không dùng biến `NEXT_PUBLIC_...` cho khóa dịch vụ.

## 4. Database mới trên máy cục bộ

Dự án cần bảng D1 trước khi gọi API. Sau build, trên **database local mới chưa có schema**, chạy một lần:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_worried_puma.sql
```

Lệnh dùng `--local`, không áp dụng lên production. Không chạy lại SQL tạo bảng mù quáng trên database đã có; kiểm tra trạng thái migration trước.

Bảng records ban đầu có thể rỗng: danh mục nền được đọc từ lib/seed.ts và lib/catalog-expansion.ts rồi hợp nhất với các chỉnh sửa được xuất bản trong D1. Không cần chép 120 vật dụng vào bảng để ứng dụng nhìn thấy seed.

Chạy bản build cục bộ:

```sh
pnpm run start
```

Mở địa chỉ localhost do terminal thông báo. Lệnh start dùng cùng đường dẫn trạng thái D1 `.wrangler/state`.

Khi sửa UI, có thể dùng:

```sh
pnpm run dev
```

Chế độ portable đặt cổng dev 5173; dùng địa chỉ thực terminal báo. Nếu có lỗi “no such table”, kiểm tra database/path persist đang dùng và migration local, không thêm mã tự tạo bảng trong request.

Camera và định vị cần quyền trình duyệt và ngữ cảnh an toàn (HTTPS hoặc localhost được hỗ trợ). Mở bằng địa chỉ HTTP LAN trên điện thoại có thể bị hạn chế; khi kiểm tra thiết bị thật, sử dụng môi trường HTTPS được phép.

Môi trường phát triển portable có mô phỏng xác thực ở lớp preview. Không đưa máy chủ dev này lên Internet và không coi mock auth là xác thực production. Kiểm tra build/sites-vite-plugin.ts và xác thực nền tảng khi chuyển môi trường.

## 5. Hợp đồng adapter AI

Luồng browser → /api/recognize yêu cầu đồng ý. Server gửi POST đến VISION_ENDPOINT với Authorization: Bearer VISION_API_KEY, Content-Type: application/json:

```json
{
  "image": "BASE64_PNG",
  "mimeType": "image/png",
  "catalog": [{"id": "pin-aa", "name": "Pin AA / AAA"}],
  "instruction": "Chỉ nhận dạng vật; không trả hướng dẫn xử lý hoặc địa điểm."
}
```

Ví dụ hình dạng phản hồi mà adapter phải trả (đây là hợp đồng, không phải kết quả nhận diện thật):

```json
{
  "status": "ok",
  "candidates": [{"itemId": "pin-aa", "label": "Pin tiểu"}]
}
```

- status: ok, blurry hoặc empty; candidates tối đa 8.
- itemId phải có trong catalog; unknown ID bị lọc.
- Có thể dùng candidates rỗng cho blurry/empty.
- Timeout 25 giây; giới hạn 10 yêu cầu/IP/giờ.
- Endpoint phải là HTTPS, không theo redirect.
- Adapter kết nối nhà cung cấp AI do chủ website chọn và xử lý đầu ra theo hợp đồng trên; không giả định URL API gốc của nhà cung cấp đã tương thích.
- Server không chấp nhận hướng dẫn xử lý hoặc địa điểm do mô hình tạo. Phân loại và nơi tiếp nhận do bộ quy tắc/dữ liệu có nguồn quyết định.
- Trước khi bật thật, kiểm tra quyền riêng tư, quota tổng, cấu hình lỗi và khả năng xử lý ảnh bằng dịch vụ thực.

Giới hạn ảnh client hiện tại: JPEG/PNG/WebP, tối đa 15 MB/48 triệu pixel đầu vào, co cạnh dài tối đa 1400 px rồi chuyển PNG. Server giới hạn PNG 6 MB/4 triệu pixel và kiểm tra cấu trúc. Không lưu file ảnh ở server.

## 6. Kiểm thử và nghiệm thu

```sh
pnpm run typecheck
pnpm run test
pnpm run lint
pnpm run build
```

Không giả định lint hoặc E2E của môi trường mới đạt chỉ vì build ở môi trường cũ đã đạt. Trạng thái có bằng chứng gần nhất nằm ở BAN_GIAO_CHO_AI.md và VALIDATION.md.

Kiểm thử trình duyệt dùng Playwright qua `pnpm run test:e2e`; cấu hình mặc định trỏ tới http://127.0.0.1:4173. Chỉ chạy với server kiểm thử/local đã chuẩn bị và TEST_BASE_URL đúng. Đọc tests/e2e.spec.ts trước khi chạy vì có thể ghi dữ liệu. Không trỏ E2E ghi dữ liệu vào production.

Bắt buộc phân biệt mô phỏng với thử thật:
- Chọn/cùng ảnh/đổi/xóa ảnh, đóng cửa sổ khi đang xử lý, AI chưa cấu hình.
- Camera cho phép/từ chối/không có thiết bị; đóng, chuyển tab/app và dừng camera.
- GPS cho phép/từ chối/timeout, thử lại, chọn khu vực thủ công, khung nhúng.
- Đổi vật/ảnh/điều kiện nhanh: kết quả cũ không ghi đè thao tác mới.
- Nhiệt kế thủy ngân còn nguyên/vỡ, nguồn thiếu/xung đột, không suy diễn nơi nhận.
- Màn hình nhỏ, bàn phím, cuộn cửa sổ, giảm chuyển động, Maps mở đúng đích.

## 7. Cập nhật website hiện tại

URL: https://xanh360-ban-moi.dongnguyen-lienket.chatgpt.site

Site ID trong project/.openai/hosting.json là nhận dạng dự án, **không phải khóa truy cập**. AI cần công cụ Sites và quyền sửa dự án để cập nhật URL này.

Trong môi trường Sites, đọc skill/quy trình hiện hành trước khi cài, preview, commit, đóng gói hoặc triển khai. Dùng profile/installer/build workflow của môi trường đó; không ép lệnh portable lên managed runtime. Giữ cùng project ID, đồng bộ đúng source, kiểm tra rồi xuất bản bản đã lưu theo quy trình có sẵn. Đọc lại quyền truy cập hiện tại và giữ nguyên; gói xuất không ủy quyền thay đổi audience.

Nếu không có quyền Sites: trả source/patch/ZIP đã sửa để chủ website đưa trở lại môi trường có quyền. Đừng tạo website khác và gọi đó là cập nhật URL cũ.

## 8. Khi chuyển hẳn sang host khác

Cần chọn môi trường tương thích Workers/D1 hoặc chuyển đổi backend rõ ràng. Xác thực ChatGPT do Sites cấp không tự có trên host mới. Chỉ sao chép thư mục source không chuyển được database, khóa hay quyền đăng nhập.

ZIP có schema + seed, không có records/drafts/feedback/audit/rate_limits production. Nếu người dùng cần chuyển dữ liệu thật, lập yêu cầu xuất/nhập riêng với quyền phù hợp; tránh làm mất override. Lịch sử tra cứu localStorage trên từng thiết bị cũng không nằm trong gói.
