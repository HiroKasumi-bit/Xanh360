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

## Nguyên tắc luôn giữ

- Không bịa địa chỉ, số điện thoại, tọa độ hay quy định. Không tìm được thì ghi rõ là không có; chưa rõ thì bỏ ra.
- Không tự merge PR. Merge vào `main` sẽ tự deploy lên Cloudflare (`.github/workflows/deploy.yml`).
- Migration D1 chỉ thêm bảng/cột mới, không xoá hay sửa dữ liệu cũ.
- Trước khi mở PR: chạy `pnpm run typecheck`, `pnpm run test`, `pnpm run build`. Mô tả PR bằng tiếng Việt, có cách khôi phục (Revert trên GitHub hoặc Rollback trên Cloudflare → Workers & Pages → xanh360 → Deployments).
