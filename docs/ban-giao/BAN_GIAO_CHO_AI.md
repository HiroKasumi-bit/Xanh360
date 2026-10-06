# Bàn giao Xanh360 cho AI tiếp theo

Ngày: 06/10/2026 (UTC). Mã nguồn gốc: `26bd6aa4fc905d803c1ed9739e49b499a8fb65e4`.

## Ý định và ưu tiên của chủ website

Xanh360 giúp người dùng: **chụp/tải ảnh hoặc nhập tên → xác nhận vật dụng và tình trạng → biết cách bỏ rác → tìm nơi tiếp nhận phù hợp khi cần**.

Ưu tiên: chức năng hoạt động thật; dễ dùng trên điện thoại; giao diện xanh hiện đại, sinh động, hiệu ứng mượt. Giữ thương hiệu, dữ liệu và chức năng đã có; đọc code trước khi thay đổi. Chủ website muốn giao diện có màu sắc và chuyển động rõ hơn nhưng vẫn dễ dùng. Không viết lại toàn bộ khi không cần.

Yêu cầu mới nhất trước khi xuất là mở rộng danh mục, đặc biệt nhiệt kế thủy ngân; phần này đã được triển khai. Yêu cầu hiện tại chỉ là bàn giao cho AI khác, không phải một yêu cầu thay đổi ứng dụng nữa.

## Hiện trạng chức năng

| Phần | Đã có | Giới hạn |
| --- | --- | --- |
| Tra cứu | Tìm tên/tên khác/không dấu; hỏi điều kiện; nguồn hướng dẫn; lọc vật liệu/thu gom riêng | Hướng dẫn phụ thuộc điều kiện và nguồn; không phải mọi vật đều có kết luận chắc chắn |
| Ảnh | JPEG/PNG/WebP; kéo thả; xem trước, đổi/xóa; xử lý trên thiết bị | HEIC chưa hỗ trợ trực tiếp; ảnh tải lên thành công chưa có nghĩa AI nhận diện thành công |
| Camera | Khung ngắm; ưu tiên camera sau; chụp/chụp lại/dùng ảnh; dừng track khi rời luồng; phương án camera thiết bị | Cần quyền và secure context; chưa kiểm thử phần cứng thật |
| AI | API có hợp đồng, đồng ý trước khi gửi ảnh, timeout/lỗi, lọc itemId hợp lệ | Chưa cấu hình endpoint/key, chưa kiểm thử nhà cung cấp thật |
| Vị trí | Xin khi bấm; báo lỗi quyền/timeout/khả dụng; độ chính xác; hủy kết quả cũ; chọn khu vực thủ công | Chưa đối chiếu tọa độ với polygon phường/xã; không suy ra khu vực giả |
| Điểm tiếp nhận | Lọc khả năng nhận; nguồn; địa chỉ/liên hệ; Maps URL; retry lỗi API | 4 điểm theo nguồn công bố, chưa xác nhận trực tiếp, chưa có tọa độ kiểm chứng |
| An toàn | Kết quả riêng cho vật nguy hại bị hỏng; nhiệt kế thủy ngân nguyên/vỡ; bóng huỳnh quang vỡ | Thiếu nguồn hoặc quy tắc xung đột thì giữ hướng dẫn hỗ trợ chuyên trách |
| Lịch sử | Lưu tối đa 30 lần tra cứu trên thiết bị | Không đồng bộ; không lưu ảnh hoặc lịch sử tọa độ |
| Giao diện | Hành động chụp/tải/nhập tên; thẻ kết quả; gradient, vòng tái chế/quả cầu trang trí, phản hồi tương tác; điều khiển chuyển động | Chưa có kiểm tra trực quan đa thiết bị đầy đủ; phải giữ reduced-motion |
| Môi trường | Widget thời tiết/AQI phụ trợ, cache và trạng thái thiếu/quá hạn | Số liệu mô hình/điểm tham chiếu; không mô tả là trạm đo gần người dùng |
| Quản trị | Nháp/xuất bản/phiên bản/audit/khôi phục nháp, kiểm tra quyền server | Cần ADMIN_EMAILS và danh tính do nền tảng xác thực |

## Danh mục mới nhất

- 120 vật dụng trong seed: 48 cũ + 72 bổ sung.
- 38 quy tắc, 15 nguồn; đợt cuối bổ sung 25 quy tắc và 7 nguồn.
- 4 điểm tiếp nhận giữ nguyên, không thêm địa điểm minh họa.
- 168 đơn vị hành chính + lựa chọn toàn khu vực. Đây là snapshot có nguồn, không tự đồng bộ thay đổi địa giới.
- Bổ sung nhiệt kế thủy ngân/điện tử, thuốc/vỉ thuốc/lọ thuốc, bút insulin/kim chích, hóa chất gia dụng/thuốc trừ sâu/dung môi/dầu thải, bình gas/bật lửa, thuốc lá điện tử, pin xe/pin 9V, thiết bị điện tử, bao bì và rác sinh hoạt khác.
- Quy tắc sự cố nguy hại phải có nguồn còn phù hợp, khớp đúng vật và trạng thái. Không cho quy tắc rác thông thường lấn át cảnh báo an toàn.
- Với vật thu gom riêng bị vỡ/rò rỉ, tab Điểm tiếp nhận ưu tiên hướng dẫn an toàn và không thúc đẩy mang đi/chỉ đường.
- Việc có trong danh mục không đồng nghĩa đã có điểm tiếp nhận phù hợp hoặc đã được AI nhận diện tốt.

Dữ liệu thực tế API là seed hợp nhất với bản ghi đã xuất bản trong D1. ZIP không chứa các override production; số trên mô tả seed của commit xuất.

## Những thay đổi đáng chú ý và tệp liên quan

| Tệp | Vai trò |
| --- | --- |
| app/waste-app.tsx | Luồng chính, tab, tìm tên, điều kiện, kết quả, điểm tiếp nhận và lịch sử |
| app/photo-dialog.tsx | Tải/chụp/xem ảnh, chấp thuận nhận diện, vòng đời camera |
| lib/image.ts | Chuẩn hóa ảnh phía client và kiểm tra cấu trúc PNG phía server |
| hooks/use-location.ts | Trạng thái định vị và bỏ kết quả bất đồng bộ đã cũ |
| lib/device-access.ts, app/location-status.tsx | Quyền thiết bị, lỗi, hiển thị vị trí/phương án dự phòng |
| lib/client.ts | Đọc phản hồi API an toàn, xử lý HTML/redirect/JSON/lỗi mạng/hủy |
| app/eco-visual.tsx, app/visuals.css, app/globals.css | Hiệu ứng, điều khiển chuyển động, thiết kế |
| lib/domain.ts | Zod schema, phân loại theo điều kiện, nguồn, lọc điểm và Maps URL |
| lib/seed.ts, lib/catalog-expansion.ts, lib/areas.json | Dữ liệu nền có nguồn |
| lib/repository.ts | Đọc seed và hợp nhất bản ghi D1 |
| app/api/recognize/route.ts | Adapter nhận diện ảnh tùy chọn; mô hình chỉ nhận dạng vật |
| app/api/catalog, app/api/classify, app/api/points | API danh mục, kết quả, điểm tiếp nhận |
| app/api/admin, app/admin, lib/http.ts | Quyền, quản trị, giới hạn yêu cầu và HTTP |
| app/environment-panel.tsx, lib/*environment*, lib/weather-backup.ts | Thời tiết/AQI, nguồn chính và dự phòng |
| db/schema.ts, drizzle/ | Schema D1/Drizzle và migration |
| tests/ | Vitest nghiệp vụ/API/thiết bị mô phỏng và Playwright chưa chạy |

Lỗi “Unexpected token '<'” đã được xử lý ở lớp đọc API để không hiển thị lỗi JSON thô khi nhận HTML, redirect hoặc nội dung rỗng. Tab Điểm tiếp nhận có thử lại và mở tab riêng. Chưa tái hiện được nguyên nhân HTML trong đúng phiên trình duyệt của người dùng; không khẳng định lỗi gốc luôn là hết phiên đăng nhập. Kiểm tra HTTP trực tiếp trước đợt sửa trả JSON hợp lệ cho catalog và points.

## Kiến trúc cần giữ đúng

- React + TypeScript + Tailwind, Next-compatible **Vinext**, Cloudflare Workers.
- D1 binding **DB**, Drizzle migration. Không phải PostgreSQL, Prisma hoặc một backend Node thông thường.
- Bảng nghiệp vụ: records, drafts, feedback, audit_log, rate_limits.
- Seed chỉ đọc, được hợp nhất với bản ghi đã xuất bản trong D1; bản ghi trùng ID ghi đè seed. Khi thay seed phải xem xét override cũ.
- Không tự tạo schema trong request/startup và không chạy migration production thủ công ngoài quy trình đã được phép.
- Quản trị dùng danh tính ChatGPT cấp nền tảng + ADMIN_EMAILS phía server; không chấp nhận header danh tính do khách gửi để bỏ kiểm tra quyền.
- Không lưu ảnh người dùng ở R2; R2 hiện không được bật.
- localStorage chỉ dùng lịch sử tra cứu và lựa chọn giao diện như chuyển động.
- Runtime nằm trên Sites; khóa và dữ liệu live không nằm trong ZIP.

## Cấu hình còn thiếu và giới hạn cần nói thật

1. **VISION_ENDPOINT + VISION_API_KEY**: cần endpoint HTTPS đáng tin và adapter theo HUONG_DAN_CHAY.md. Không chỉ dán URL API bất kỳ của nhà cung cấp rồi giả định sẽ chạy. Không đưa key vào client.
2. **ADMIN_EMAILS**: cần allowlist email hợp lệ nếu muốn dùng quản trị.
3. **Điểm tiếp nhận**: cần dữ liệu thực, nguồn chấp nhận đúng loại và xác minh. Chưa có điểm đã xác minh cho thủy ngân, thuốc, vật sắc nhọn, pin xe. Không mở rộng khả năng nhận của 4 điểm hiện có bằng phỏng đoán.
4. **Bản đồ**: Maps URLs không cần key; GOOGLE_MAPS_API_KEY hiện là biến dự phòng, chưa nối Places/Routes/geocoding hoặc polygon địa giới.
5. **Ảnh**: kiểm tra PNG server hiện thiên về cấu trúc/kích thước, chưa thay thế bộ giải mã ảnh đầy đủ. Cần rà soát trước khi mở dịch vụ AI quy mô lớn.
6. **Hạn mức**: có rate limit theo IP; chưa có quota tổng nhà cung cấp AI. Cache thời tiết trong bộ nhớ, không phải cache phân tán.
7. **Tài khoản/host mới**: ZIP không mang theo xác thực Sites, D1 production hoặc quyền xuất bản. Chuyển host cần lập phương án riêng; không tắt auth cho “chạy được”.
8. **Kiểm thử thực tế**: camera/GPS thật, giao diện điện thoại và nhận diện AI thật vẫn cần kiểm tra.

## Kiểm tra đã ghi nhận

Ở commit hiện tại: **123 kiểm thử Vitest đạt**, TypeScript đạt, production build đã thành công và bản cuối đã triển khai. Xem phần “06/10/2026 — Mở rộng danh mục và hướng dẫn thủy ngân” trong VALIDATION.md.

- 28 ca mới của đợt mở rộng + 95 ca trước.
- Có kiểm tra dữ liệu danh mục, tình trạng nguy hại, nguồn thiếu/hết hạn/xung đột, API nhiệt kế vỡ và không suy diễn điểm tiếp nhận.
- Kiểm thử thiết bị dùng API mô phỏng; không chứng minh camera/GPS vật lý đã hoạt động.
- Playwright đã có tệp kiểm thử nhưng chưa chạy; không có xác nhận trực quan đa trình duyệt.
- Các kiểm tra trên là kết quả của vòng phát triển trước, không phải phép đo mới trong lần xuất ZIP. Lần xuất chỉ kiểm tra tính toàn vẹn gói và đối chiếu tệp với commit; không sửa hay triển khai lại ứng dụng.

## Các nguyên tắc không được phá vỡ

- Không giả kết quả AI, lấy tên tệp hoặc lựa chọn người dùng làm kết quả AI.
- Ảnh chỉ gửi ra ngoài khi người dùng đồng ý và bấm nhận diện.
- Không xin camera/GPS tự động; dừng camera khi đóng/rời luồng; loại kết quả cũ khi thao tác nhanh.
- Không khẳng định mọi nhựa đều tái chế được hoặc màu thùng giống nhau ở mọi địa phương.
- Không tạo địa điểm, số điện thoại, tọa độ, khoảng cách, tình trạng xác minh hoặc khả năng tiếp nhận giả.
- Khoảng cách chỉ tính từ tọa độ đáng tin, ghi rõ đường chim bay.
- Với rác nguy hại, hướng dẫn phải theo loại/trạng thái và có nguồn; không dùng một hướng dẫn chung để xử lý mọi sự cố.
- Giữ nhãn/biểu tượng, thao tác bàn phím, màn hình nhỏ, cửa sổ cuộn được và cài đặt giảm chuyển động.
- Không tự mua dịch vụ, đổi phạm vi truy cập hoặc triển khai sang một website khác.
- Đọc yêu cầu mới của người dùng trước khi sửa; việc xuất ZIP chưa xác định ưu tiên tiếp theo.

## Gợi ý thứ tự công việc tiếp theo khi người dùng yêu cầu

1. Kiểm thử thực trên điện thoại: ảnh, camera, GPS, trạng thái quyền, luồng nhanh và cửa sổ.
2. Cấu hình adapter AI thật, kiểm thử từ ảnh → chọn vật → hỏi trạng thái → kết quả, có kiểm soát chi phí.
3. Bổ sung điểm tiếp nhận đã kiểm chứng đúng loại rác, theo khu vực người dùng cần.
4. Rà soát lại toàn bộ tài liệu cũ, nguồn theo địa phương và override D1.
5. Tiếp tục tinh chỉnh hiệu ứng sau khi xác nhận hiệu năng và khả năng sử dụng.

Đây là gợi ý, không phải ủy quyền tự động để mua dịch vụ, chia sẻ dữ liệu hoặc thay đổi triển khai.
