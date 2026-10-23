# Hướng dẫn cho Claude khi làm việc với repo Xanh360

Người dùng là sinh viên, không phải lập trình viên chuyên sâu, muốn giao việc rồi chỉ duyệt. Trả lời và viết giao diện bằng tiếng Việt.

## Việc lớn: hỏi tối đa 3 câu trước khi làm

Trước khi bắt đầu một **việc lớn**, hỏi người dùng **tối đa 3 câu** về những chỗ còn mơ hồ hoặc xung đột trong yêu cầu, rồi mới làm. Không viết lại cả prompt; chỉ hỏi những điểm thật sự làm thay đổi cách làm.

Việc lớn là việc có ít nhất một trong các dấu hiệu:
- nhiều phần, hoặc dự kiến nhiều nhánh/PR;
- dùng dữ liệu thật cần tra nguồn (địa chỉ, số điện thoại, quy định, tọa độ…);
- thay đổi database D1 (bảng, cột, migration);
- ảnh hưởng tới deploy, bảo mật, hoặc dịch vụ bên ngoài.

Nên hỏi về:
- **Mâu thuẫn hoặc phụ thuộc** giữa các yêu cầu (ví dụ "mỗi phần cắt từ main" nhưng phần sau cần phần trước).
- **Điều kiện môi trường**: mạng đã mở cho các trang cần tra chưa, có MCP/công cụ cần dùng không. Kiểm tra nhanh trước; nếu bị chặn thì hỏi luôn trong 3 câu này.
- **Ưu tiên khi xung đột** (ví dụ "đủ loại dữ liệu" va với "chỉ dùng thông tin có nguồn").

Việc nhỏ, rõ ràng (sửa chữ, đổi màu, sửa một lỗi cụ thể) thì làm luôn, không cần hỏi.

## Gợi ý model và effort

Người dùng tự chọn model và mức effort khi tạo cuộc trò chuyện; Claude không tự đổi được. Ở đầu mỗi việc lớn (cùng lúc với 3 câu hỏi ở trên), thêm **một dòng** gợi ý model và effort hợp với việc đó, theo bảng dưới. Nếu đang dùng đúng mức hợp lý thì nói ngắn "model/effort hiện tại là đủ"; nếu thấp hơn mức nên dùng thì nói rõ có thể đổi ngay trong cuộc trò chuyện này. Việc nhỏ thì không cần gợi ý.

| Loại việc | Model | Effort |
|---|---|---|
| Sửa chữ, đổi màu, sửa một lỗi rõ ràng | Sonnet hoặc Haiku | thấp–vừa |
| Thêm tính năng trong vài file, viết test | Sonnet hoặc Opus | vừa–cao |
| Việc nhiều phần, tra dữ liệu thật nhiều nguồn, đổi database D1, ảnh hưởng deploy/bảo mật | Opus | cao |

## Thiết kế giao diện: dùng impeccable + ui-ux-pro-max

Mỗi khi thiết kế, sửa hoặc review giao diện (trang, component, màu, chữ, bố cục, hiệu ứng, hình minh họa), dùng cả hai skill:
- **impeccable** dẫn dắt: định hướng, làm, rồi `critique` / `audit` / `polish` trước khi giao.
- **ui-ux-pro-max** để tra cứu và kiểm tra: quy tắc accessibility, vùng chạm, chuyển động, màu, font; chạy checklist trước khi giao.
- Thiết kế đang có của Xanh360 là chuẩn ("lá & giấy dưới nắng", hình Sài Gòn ở đầu trang). Không để skill tự đổi bảng màu, font hay phong cách khi chưa hỏi. Hỏi trước khi tạo `PRODUCT.md`, `DESIGN.md` hay thư mục `design-system/`.
- Chụp màn hình điện thoại và máy tính gửi người dùng duyệt trước khi mở PR.

## Nguyên tắc luôn giữ

- Không bịa địa chỉ, số điện thoại, tọa độ hay quy định. Không tìm được thì ghi rõ là không có; chưa rõ thì bỏ ra.
- Không tự merge PR. Merge vào `main` sẽ tự deploy lên Cloudflare (`.github/workflows/deploy.yml`).
- Migration D1 chỉ thêm bảng/cột mới, không xoá hay sửa dữ liệu cũ.
- Trước khi mở PR: chạy `pnpm run typecheck`, `pnpm run test`, `pnpm run build`. Mô tả PR bằng tiếng Việt, có cách khôi phục (Revert trên GitHub hoặc Rollback trên Cloudflare → Workers & Pages → xanh360 → Deployments).
