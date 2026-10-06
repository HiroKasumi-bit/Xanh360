# Xanh360 — bắt đầu ở đây

Đây là gói bàn giao mã nguồn để một AI hoặc lập trình viên khác tiếp tục phát triển Xanh360, xuất ngày 06/10/2026 (UTC).

## Đọc theo thứ tự

1. Tệp này.
2. `BAN_GIAO_CHO_AI.md`: hiện trạng, kiến trúc, giới hạn và các nguyên tắc phải giữ.
3. `HUONG_DAN_CHAY.md`: môi trường, database, cấu hình và cách kiểm tra.
4. `project/package.json`, `project/VALIDATION.md`, rồi đọc mã nguồn liên quan trước khi sửa.
5. Người dùng có thể dùng nguyên văn `PROMPT_CHO_AI_TIEP_THEO.txt` khi mở cuộc trò chuyện mới.

## Bản được bàn giao

- Website: https://xanh360-ban-moi.dongnguyen-lienket.chatgpt.site
- Tên: **Xanh360**.
- Mã nguồn trong `project/` lấy từ commit `26bd6aa4fc905d803c1ed9739e49b499a8fb65e4`.
- Site project ID: `appgprj_6ac2243abf808191aeb072b8fc9911d9`.
- Tại thời điểm xuất, Sites báo website đang hoạt động, phạm vi truy cập `public`, phiên bản số 5. Việc xuất này không thay đổi website hoặc quyền truy cập.
- Danh mục nền hiện có **120 vật dụng**, gồm **nhiệt kế thủy ngân** và hướng dẫn riêng khi còn nguyên hoặc bị vỡ.
- Có **4 điểm tiếp nhận theo nguồn công bố**, chưa được xác nhận trực tiếp; không được suy diễn rằng các điểm này nhận thủy ngân, thuốc, vật sắc nhọn hay pin xe.

**Lưu ý tài liệu cũ:** `project/README.md` và phần đầu `project/VALIDATION.md` được giữ nguyên theo commit để bảo toàn bản chụp mã nguồn. Một số đoạn mô tả bản đầu (48 vật dụng, trạng thái riêng tư, số kiểm thử cũ) đã lỗi thời. Dùng tài liệu ở thư mục ngoài này và mục có ngày mới nhất của `VALIDATION.md` để hiểu hiện trạng. Hạn mức/điều khoản nhà cung cấp ghi trong README cũ cũng cần kiểm tra lại trước khi sử dụng.

## Có gì trong ZIP?

- `project/`: toàn bộ tệp được Git theo dõi ở commit trên, bao gồm mã nguồn, lockfile, migration, kiểm thử, cấu hình mẫu và nhận dạng website.
- Các tệp bàn giao này: cách tiếp tục mà không cần đọc lại cuộc trò chuyện.
- `THONG_TIN_PHIEN_BAN.json`: phiên bản và các giới hạn của bản xuất.
- `SHA256SUMS.txt`: mã kiểm tra toàn vẹn của các tệp trong gói, trừ chính tệp này.

Không kèm khóa API, thông tin đăng nhập, lịch sử Git, node_modules, bản build, dữ liệu database production, phản hồi/audit của người dùng hoặc lịch sử trên thiết bị. `.env.example` chỉ chứa tên biến với giá trị rỗng.

## Những gì chưa sẵn sàng

- AI nhận diện ảnh cần `VISION_ENDPOINT`, `VISION_API_KEY` và adapter đúng hợp đồng; camera/tải ảnh/xem trước và tra cứu tên không phụ thuộc vào việc đã cấu hình AI.
- Quản trị cần `ADMIN_EMAILS` và cơ chế xác thực nền tảng.
- Chưa có địa điểm tiếp nhận được xác minh cho nhiều loại rác nguy hại mới.
- Chưa kiểm thử camera/GPS trên điện thoại thật hoặc hoàn tất kiểm thử giao diện bằng trình duyệt.
- ZIP là mã nguồn, không tự cấp quyền triển khai tới website hiện tại.

## Tiếp tục trên đúng website

Nếu AI tiếp theo có công cụ Sites và quyền sửa dự án: đọc `project/.openai/hosting.json`, chọn đúng project ID hiện có, đọc quy trình Sites đang áp dụng, giữ phạm vi truy cập hiện tại rồi cập nhật dự án đó. Không tạo website mới chỉ vì nhận được một ZIP.

Nếu AI không có quyền Sites: vẫn có thể sửa và kiểm tra mã nguồn ở môi trường phù hợp, sau đó trả ZIP hoặc patch đã sửa. Người dùng có thể gửi lại kết quả ở cuộc trò chuyện có quyền truy cập website này để triển khai. Chuyển hẳn sang nền tảng khác là công việc riêng, cần xử lý Workers/D1/xác thực và dữ liệu; không mặc định đây là ứng dụng HTML tĩnh hoặc Next.js chạy ở mọi host.
