# Kết quả kiểm tra

- 44 kiểm thử Vitest thành công: quy tắc phân loại, điều kiện, hết hạn, phạm vi, dữ liệu hành chính, lọc điểm tiếp nhận, liên kết Maps, API và lưu trữ SQLite, quyền quản trị, phiên bản và audit.
- TypeScript và ESLint thành công.
- Migration D1 đã chạy thành công trong môi trường cục bộ.
- Kiểm thử trình duyệt Playwright đã được viết nhưng chưa chạy. Môi trường preview báo đang chạy nhưng địa chỉ trả 502; chưa xác nhận giao diện trực quan hoặc thao tác Google Maps trên thiết bị thật.
- Chưa cấu hình dịch vụ nhận diện ảnh; API trả trạng thái chưa sẵn sàng, không tạo kết quả giả. Adapter chưa được kiểm tra với dịch vụ AI thực tế.
- Chưa có API tìm kiếm/định tuyến bên ngoài. Google Maps URLs dùng được không cần khóa.
- Bốn điểm thu gom có nguồn công bố được gắn nhãn cần liên hệ xác nhận; chưa đủ tọa độ đáng tin cậy để xếp hạng khoảng cách. Không tạo điểm minh họa giả làm địa điểm thật.
- Phạm vi hành chính dùng danh sách 168 đơn vị từ nguồn Chính phủ; chưa có kiểm tra tọa độ bằng polygon địa giới.

Đây là bản ứng dụng chạy thử riêng tư. Cần chạy kiểm thử trình duyệt và xác minh dữ liệu tiếp nhận thực địa trước khi giới thiệu như dịch vụ công khai hoàn chỉnh.


## Nâng cấp Xanh360

54 kiểm thử đạt (10 kiểm thử mới về tọa độ, dữ liệu thiếu, các ngưỡng AQI, timestamp, lỗi từng nguồn và geocoding). Không chạy trình duyệt vì skill điều khiển trình duyệt yêu cầu bởi môi trường Sites không khả dụng. Cần kiểm tra trải nghiệm GPS thực trên thiết bị.

Widget TP.HCM: 56 kiểm thử đạt, bổ sung tính khoảng dữ liệu thiếu và điểm tham chiếu đất liền/đảo. Chưa kiểm thử trực quan trên trình duyệt.

Sửa lỗi production 04/10: Workers từ chối redirect:error. Đổi sang manual, vẫn từ chối HTTP 3xx và không theo chuyển hướng. Bổ sung kiểm thử hồi quy; UI báo dữ liệu thiếu ngay trên khung thay vì chỉ dấu gạch.


## 06/10/2026 — Tải ảnh, camera, vị trí và giao diện

- 77 kiểm thử Vitest đạt, gồm 58 kiểm thử cũ và 19 kiểm thử mới cho quyền vị trí, lỗi thiết bị, timeout, hủy yêu cầu, tọa độ không hợp lệ, dừng camera và chuẩn hóa ảnh.
- TypeScript kiểm tra thành công trước bước đóng gói; build triển khai được chạy bởi quy trình xuất bản.
- Kiểm thử thiết bị dùng mô phỏng các API trình duyệt. Không đồng nghĩa đã kiểm tra phần cứng hoặc hộp thoại xin quyền trên điện thoại thật.
- Không chạy kiểm thử trình duyệt hay chụp ảnh màn hình: skill control-browser cần thiết cho QA của môi trường Sites không khả dụng. Không cài hoặc mở trình duyệt thay thế.
- Cần kiểm tra thật trên Chrome Android/Safari iOS: chọn/cùng ảnh/đổi ảnh, camera cho phép/từ chối/đóng/chuyển ứng dụng; vị trí cho phép/từ chối/thử lại/tab nhúng; màn hình 360px và chế độ giảm chuyển động.
- Nhận diện AI chưa cấu hình, giữ trạng thái thật và tra cứu tên dự phòng. Không gọi AI trong đợt kiểm thử này.


## 06/10/2026 — Phản hồi API tại Điểm tiếp nhận

- Khắc phục việc hiển thị lỗi phân tích JSON thô khi máy chủ trả HTML, phản hồi rỗng hoặc dữ liệu không hợp lệ. Kiểm tra Content-Type trước khi đọc JSON; không tự theo chuyển hướng API sang trang đăng nhập. Giữ nguyên thông báo JSON hợp lệ của máy chủ và cơ chế hủy yêu cầu cũ.
- Thêm nút Thử lại tại Điểm tiếp nhận; gợi ý mở tab riêng khi cần kiểm tra phiên truy cập. Giữ nguyên dữ liệu, điều kiện tiếp nhận và quyền riêng tư.
- 95 kiểm thử Vitest đạt: 16 ca mới cho HTTP/HTML/JSON/chuyển hướng/lỗi mạng/hủy yêu cầu và 2 ca mới cho hợp đồng API điểm tiếp nhận. TypeScript đạt.
- Kiểm tra HTTP trực tiếp có xác thực dịch vụ trước khi sửa: GET /api/catalog và POST /api/points đều trả 200 application/json; truy vấn pin AA/AAA trả 4 điểm cần liên hệ xác nhận, 0 điểm đã xác minh trực tiếp. Không thay đổi dữ liệu trong kiểm tra này.
- Chưa tái hiện được nguyên nhân khiến phiên trình duyệt của người dùng nhận HTML. Kiểm tra dịch vụ không thay thế kiểm tra phiên đăng nhập trong trình duyệt; không khẳng định nguyên nhân là hết phiên hoặc lỗi định tuyến.
- Chưa chạy kiểm thử giao diện/trình duyệt vì skill control-browser của môi trường Sites không khả dụng.


## 06/10/2026 — Mở rộng danh mục và hướng dẫn thủy ngân

- Danh mục tăng từ 48 lên 120 vật dụng (72 mục mới), có tên gọi khác và tìm kiếm không dấu. Bổ sung thuốc, kim chích máu, nhiệt kế, hóa chất gia dụng, gas, thuốc lá điện tử, pin xe, điện tử, bao bì, đồ vệ sinh và đồ cồng kềnh.
- Thêm 25 hướng dẫn cụ thể, 7 nguồn tham khảo. Tách nhiệt kế thủy ngân còn nguyên / vỡ; bóng huỳnh quang vỡ có hướng dẫn riêng. Quy tắc sự cố chỉ áp dụng cho đúng vật, đúng trạng thái và còn nguồn/hiệu lực. Trường hợp thiếu nguồn hoặc xung đột giữ cảnh báo cần hỗ trợ chuyên trách.
- Kết quả sự cố hiển thị các bước an toàn và nguồn; không hiện nút chỉ đường mang đi. Khi chọn vật cần thu gom riêng bị vỡ/rò rỉ ở tab Điểm tiếp nhận, ứng dụng đưa người dùng về hướng dẫn an toàn trước.
- Lọc danh mục theo vật liệu hoặc Cần thu gom riêng; biểu tượng nhiệt kế/thuốc/kim tiêm rõ hơn.
- Không thêm địa điểm giả, không mở rộng phạm vi nhận của bốn điểm hiện có sang thủy ngân, thuốc, kim hoặc pin xe. Chưa có điểm tiếp nhận đã xác minh cho các loại này.
- 123 kiểm thử Vitest đạt (28 ca mới, 95 ca cũ), gồm tra cứu tên, toàn vẹn dữ liệu, hướng dẫn cho 120 mục, điều kiện an toàn, API nhiệt kế vỡ, nguồn thiếu/hết hiệu lực/xung đột và không suy diễn nơi tiếp nhận. TypeScript đạt.
- Chưa kiểm thử trực quan bằng trình duyệt vì skill control-browser cần thiết cho QA của môi trường Sites không khả dụng. Nhận diện ảnh AI và các cấu hình chưa có trước đây không được bổ sung trong đợt mở rộng danh mục này.
