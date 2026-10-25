# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Người dân TP. Hồ Chí Minh đang cầm một món đồ cần bỏ và muốn biết bỏ vào đâu cho đúng. Phần lớn dùng điện thoại, thường ngay tại chỗ (trong nhà, cạnh thùng rác, trên đường tới điểm thu gom), nên cần câu trả lời nhanh bằng tiếng Việt. Người quản trị nội dung dùng trang `/admin` để biên tập danh mục và quy tắc.

(Suy ra từ repo: README, `docs/ban-giao/`, nội dung giao diện. Chưa có khảo sát người dùng.)

## Product Purpose

Xanh360 giúp người dùng phân loại một món đồ (chụp ảnh, tải ảnh hoặc nhập tên), xem hướng dẫn xử lý theo tình trạng của món đồ, và tìm nơi tiếp nhận phù hợp ở TP.HCM. Thành công là người dùng bỏ đúng chỗ, và biết rõ phần nào là thông tin có nguồn, phần nào chưa xác nhận.

## Positioning

Hướng dẫn có nguồn, chỉ trong phạm vi TP.HCM: mỗi quy tắc và điểm tiếp nhận gắn với nguồn công bố và ngày kiểm tra. Món thiếu căn cứ được ghi "chưa xác định" thay vì đoán. Nhận diện ảnh chỉ chọn trong danh mục có sẵn; hướng dẫn và điểm tiếp nhận luôn lấy từ quy tắc có nguồn, không lấy từ mô hình AI.

## Operating Context

- Bốn tab: Tra cứu (chụp ảnh / tải ảnh / nhập tên), Điểm tiếp nhận, Danh mục, Lịch sử.
- Thời tiết và chất lượng không khí theo vị trí ở đầu trang.
- Mở chỉ đường bằng Google Maps URLs, không cần khóa API.
- Lịch sử tra cứu chỉ lưu trên thiết bị.
- Chạy trên Cloudflare Workers + D1; merge vào `main` tự deploy.

## Capabilities and Constraints

- Danh mục vật dụng có nguồn (`lib/seed.ts`, `lib/catalog-expansion.ts`), hợp nhất với bản xuất bản trong D1.
- Nhận diện ảnh bằng Workers AI miễn phí, có giới hạn lượt mỗi ngày; hết lượt thì người dùng tra bằng tên.
- Khoảng cách là đường chim bay (Haversine). Chưa có geocoding, Places, Routes hay ranh giới phường.
- Người dùng tự thêm điểm thu gom bằng GPS tại chỗ (mỗi thiết bị 1 điểm/ngày; thiết bị có hơn 3 điểm bị báo sai không thêm được nữa). Điểm hiện riêng với nhãn "chưa kiểm chứng"; 5 người xác nhận tại chỗ trong ít nhất 2 ngày thì thành "Cộng đồng xác nhận", 3 báo cáo sai thì ẩn.
- Không bịa địa chỉ, số điện thoại, tọa độ hay quy định. Không tìm được thì ghi rõ là không có.
- Không thêm dịch vụ trả phí hay cần khóa API mới.
- Migration D1 chỉ thêm bảng/cột, không xoá hay sửa dữ liệu cũ.

## Brand Commitments

- Tên: **Xanh360**. Khẩu hiệu đầu trang: "Bỏ đúng chỗ. Xanh thêm mỗi ngày."
- Toàn bộ giao diện và nội dung bằng tiếng Việt.
- Bản sắc TP.HCM: ảnh sông Sài Gòn với Chợ Bến Thành, Nhà thờ Đức Bà, Bitexco, cầu Ba Son, Landmark 81 và ghe ve chai, đổi theo giờ trong ngày. (Hoạ tiết gạch bông đã bỏ theo ý chủ dự án.)
- Người dùng (chủ dự án) yêu cầu nền trang xanh đậm, thẻ nội dung sáng, và một màu nhấn tạo chất riêng (đang chọn giữa vàng nắng, đỏ gạch, xanh mạ).

## Evidence on Hand

- Nguồn và ngày kiểm tra của từng quy tắc nằm trong `lib/seed.ts` và hiển thị trong kết quả.
- Ảnh đầu trang dựng bằng Blender: `public/hero/`, script `scripts/blender/saigon_hero.py`.
- Chưa có lời chứng thực, số liệu người dùng hay đối tác. Không được tự thêm.
- Điểm tiếp nhận theo nguồn công bố chưa được xác nhận trực tiếp; giao diện phải nói rõ điều này.

## Product Principles

1. Có nguồn hoặc nói rõ là chưa có: không đoán thay người dùng.
2. Nhanh trên điện thoại: hành động chính ("Chụp ảnh") luôn trong tầm nhìn đầu tiên.
3. Gần với Sài Gòn: hình ảnh, chữ và cách nói của người TP.HCM.
4. Riêng tư mặc định: ảnh không lưu, vị trí không lưu, lịch sử chỉ trên thiết bị.

## Accessibility & Inclusion

Chữ thường đạt tương phản tối thiểu 4,5:1, vùng chạm từ 44px, tôn trọng cài đặt giảm chuyển động của thiết bị, dùng được bằng bàn phím và trình đọc màn hình, chữ phóng to 125% không vỡ bố cục.
