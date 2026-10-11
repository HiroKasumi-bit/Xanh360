# Xanh360

Web app tiếng Việt giúp người dân TP. Hồ Chí Minh phân loại rác: chụp ảnh hoặc nhập tên món đồ → xác nhận tình trạng → biết cách bỏ → tìm điểm tiếp nhận. Đã chạy thật trên Cloudflare Workers; người dùng chủ yếu dùng điện thoại.

Tài liệu bàn giao đầy đủ: `docs/ban-giao/` (đọc `BAT_DAU_O_DAY.md` trước). Spec nâng cấp giao diện: `docs/prompts/nang-cap-giao-dien.md`.

## Luật cứng về dữ liệu và nội dung (không bao giờ phá)

- **Không bịa dữ liệu.** Không tạo địa điểm, số điện thoại, tọa độ, giờ mở cửa, khoảng cách, trạng thái xác minh hay khả năng tiếp nhận rác. Mỗi điểm tiếp nhận và mỗi quy tắc phải có nguồn.
- **Không suy diễn khả năng tiếp nhận.** Chưa có điểm xác minh cho thủy ngân, thuốc, vật sắc nhọn, pin xe. Không mở rộng khả năng nhận của 4 điểm hiện có bằng phỏng đoán.
- **Rác nguy hại:** hướng dẫn phải theo đúng loại và tình trạng (ví dụ nhiệt kế thủy ngân nguyên vẹn khác bị vỡ), có nguồn còn phù hợp. Không dùng một hướng dẫn chung cho mọi sự cố. Thiếu nguồn hoặc quy tắc xung đột thì giữ hướng dẫn "liên hệ hỗ trợ chuyên trách".
- **AI chỉ nhận diện vật,** không đưa hướng dẫn xử lý hay địa điểm. Kết quả hiển thị là tên trong danh mục, không phải chữ do mô hình viết. Không giả kết quả AI.
- **Quyền riêng tư:** ảnh chỉ gửi đi khi người dùng tích đồng ý và bấm Nhận diện; không lưu ảnh. Không tự xin camera/GPS; dừng camera khi đóng hoặc rời luồng.
- Không khẳng định mọi nhựa đều tái chế được hoặc màu thùng giống nhau ở mọi địa phương. Khoảng cách chỉ tính từ tọa độ đáng tin và ghi rõ là đường chim bay.
- Giữ thương hiệu, dữ liệu, chức năng hiện có. Không viết lại toàn bộ khi không cần.

## Luật thiết kế giao diện

Trước khi thiết kế hoặc chỉnh giao diện, dùng các skill trong `.claude/skills/`: `frontend-design` (hướng thẩm mỹ), `shadcn` (thành phần), `web-design-guidelines` (rà soát trợ năng/UX), `webapp-testing` (kiểm thử bằng Playwright).

- **Rõ ràng hơn gây ấn tượng.** Đây là app tra cứu cho công chúng, không phải trang giới thiệu. Phong cách "Lá & Giấy dưới nắng" đã chốt: giấy ấm, hero xanh sâu, một nguồn sáng. Không đổi hướng thẩm mỹ nếu không được yêu cầu.
- **Ưu tiên thành phần shadcn/ui có sẵn** (`components/ui/`) trước khi viết CSS mới. CSS tự viết (`app/globals.css`, `app/visuals.css`) đã quá dài và từng gây lỗi đè lớp (class `.outline` đụng Tailwind). Thêm CSS mới thì dùng token có sẵn trên `:root` (màu, đổ bóng, chuyển động), không hard-code.
- **Font: Be Vietnam Pro** (đã nạp sẵn). Chữ tối thiểu 12px; chữ hoa giãn cách phải để line-height ≥ 1.3 vì dấu tiếng Việt.
- **Mobile trước.** Kiểm tra ở 360, 390, 414, 768, 1366 và ngang 740x360. Không cuộn ngang trang; vùng bấm ≥ 44px; hover chỉ trong `@media (hover:hover)`.
- **Trợ năng là yêu cầu, không phải tùy chọn:** giữ `prefers-reduced-motion` và nút "Dừng hiệu ứng" (một công tắc `html[data-motion]` đặt trước lần vẽ đầu), thao tác bàn phím, nhãn cho biểu tượng, vòng focus rõ, tương phản AA, trả focus sau khi đóng hộp thoại. Chỉ animate `transform`/`opacity`.
- Giao diện phải tự làm việc được khi API lỗi hoặc thiếu dữ liệu (xem trạng thái trống, trạng thái lỗi).

## Kiến trúc

- Vinext (tương thích Next) + React 19 + TypeScript + Tailwind 4, chạy trên **Cloudflare Workers**; database **D1** (binding `DB`) qua Drizzle; **Workers AI** (binding `AI`) cho nhận diện ảnh.
- Không phải Node thông thường: không PostgreSQL/Prisma, không lệnh Next thuần. Xác thực ChatGPT Sites không có trên Cloudflare; `/admin` không dùng được ở đây (header `oai-authenticated-user-*` bị bỏ qua trừ khi `TRUST_PLATFORM_AUTH_HEADERS=true`). Không tắt kiểm tra quyền để "cho chạy".
- Dữ liệu danh mục: `lib/seed.ts` + `lib/catalog-expansion.ts` (chỉ đọc) hợp nhất với bản ghi trong D1. Không tự tạo bảng trong request.
- Nhận diện ảnh: `lib/vision.ts`, `app/api/recognize/route.ts`. Gói Workers Free chỉ cho ~10 ms CPU mỗi request: giải mã base64 bằng `Buffer`, không dùng vòng lặp từng ký tự; ảnh thu về cạnh dài 672px và gửi JPEG; có giới hạn 10 lần/IP/giờ và 100 lần/ngày toàn site (hạn mức miễn phí Neurons).
- Mã trong `app/` và `lib/` viết dày, ít xuống dòng. Khớp phong cách của file đang sửa, không tự định dạng lại cả file.

## Lệnh

```sh
pnpm install --frozen-lockfile   # giữ nguyên pnpm-lock.yaml (pnpm 11, Node >= 22.13)
pnpm run typecheck
pnpm run test                    # Vitest, ~140 ca
pnpm run lint                    # hiện có 4 lỗi + 3 cảnh báo có sẵn; không được thêm lỗi mới
pnpm run build
pnpm run start                   # chạy bản build ở http://127.0.0.1:8787 (wrangler dev, D1 cục bộ)
```

- D1 cục bộ mới cần migrate một lần: xem `docs/ban-giao/HUONG_DAN_CHAY.md` mục 4.
- Workers AI không chạy cục bộ nếu chưa đăng nhập Cloudflare: nút nhận diện sẽ báo lỗi, tra cứu theo tên vẫn chạy.
- Chụp ảnh kiểm thử: Playwright dùng Chromium cài sẵn, `executablePath: '/opt/pw-browsers/chromium'`; không chạy `playwright install`.
- Phụ thuộc mới phải qua `minimumReleaseAge` (7 ngày) trong `pnpm-workspace.yaml`; không nới chính sách này.

## Quy trình làm việc

- Trước khi push: typecheck, test, build phải đạt; lint không tăng lỗi. Với thay đổi giao diện, chụp ảnh ở các cỡ màn hình rồi nhìn, không chỉ đọc mã.
- Khi sửa lỗi, tái hiện lỗi trước, sửa, rồi đo lại cùng phép đo. Nói thật cái gì chưa kiểm tra được (camera/GPS thật, Safari iPhone, API thời tiết thật, chất lượng nhận diện thật).
- Deploy: merge vào `main` thì GitHub Actions (`.github/workflows/deploy.yml`) tự chạy migration D1 và deploy Worker `xanh360`. PR chỉ chạy typecheck, test, build. Không tự tạo website hay dịch vụ mới, không đổi quyền truy cập, không mua dịch vụ.
- Không commit khóa, token hay dữ liệu thật của người dùng. Cấu hình bí mật đặt ở Cloudflare (Variables and Secrets).
