# Setup script dùng chung cho mọi cuộc trò chuyện Claude Code trên web, dự án nào cũng được.
# Dán toàn bộ tệp này vào: tên môi trường trên thanh tiêu đề → Edit → Setup script.
# Mỗi chat mới chạy trên một máy mới, nên script này cài lại mọi thứ mỗi lần mở chat.
# "|| true": một bước tải lỗi thì chat vẫn mở bình thường.

# 1. CLAUDE.md chung
mkdir -p ~/.claude
cat > ~/.claude/CLAUDE.md <<'EOF'
# Hướng dẫn chung cho mọi dự án

Người dùng là sinh viên, không phải lập trình viên chuyên sâu, muốn giao việc rồi chỉ duyệt. Trả lời bằng tiếng Việt.

## Việc lớn: hỏi tối đa 3 câu trước khi làm
Trước một việc lớn, hỏi tối đa 3 câu về chỗ còn mơ hồ hoặc xung đột trong yêu cầu, rồi mới làm. Chỉ hỏi những điểm thật sự làm thay đổi cách làm.
Việc lớn là việc có ít nhất một dấu hiệu: nhiều phần hoặc nhiều PR; dùng dữ liệu thật cần tra nguồn; đổi database; ảnh hưởng deploy, bảo mật hoặc dịch vụ bên ngoài.
Nên hỏi về: mâu thuẫn/phụ thuộc giữa các yêu cầu; điều kiện môi trường (mạng, công cụ) — kiểm tra nhanh trước, bị chặn thì hỏi luôn; ưu tiên khi các mục tiêu xung đột.
Việc nhỏ, rõ ràng thì làm luôn.

## Gợi ý model và effort
Người dùng tự chọn model và effort; Claude không tự đổi được. Đầu mỗi việc lớn (cùng lúc với 3 câu hỏi), thêm một dòng gợi ý. Nếu mức hiện tại đã đủ thì nói ngắn; nếu thấp hơn mức nên dùng thì nói rõ có thể đổi ngay trong cuộc trò chuyện. Việc nhỏ thì không cần gợi ý.
- Sửa chữ, đổi màu, sửa một lỗi rõ ràng: Sonnet hoặc Haiku, effort thấp–vừa.
- Thêm tính năng trong vài file, viết test: Sonnet hoặc Opus, effort vừa–cao.
- Việc nhiều phần, tra dữ liệu thật nhiều nguồn, đổi database, ảnh hưởng deploy/bảo mật: Opus, effort cao.

## Nguyên tắc luôn giữ
- Không bịa dữ liệu (địa chỉ, số điện thoại, quy định…); không tìm được thì ghi rõ là không có.
- Không tự merge PR; chỉ mở PR để người dùng duyệt.
- Trước khi mở PR, chạy các bước kiểm tra của dự án (typecheck, test, build nếu có). Mô tả PR bằng tiếng Việt, kèm cách khôi phục.
EOF

# 2. Plugin
for m in pbakaus/impeccable nextlevelbuilder/ui-ux-pro-max-skill obra/superpowers-marketplace; do
  claude plugin marketplace add "$m" || true
done
for p in impeccable@impeccable ui-ux-pro-max@ui-ux-pro-max-skill superpowers@superpowers-marketplace; do
  claude plugin install "$p" || true
done

# 3. MCP Context7 (tra tài liệu thư viện, không cần API key)
claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp || true

# 4. Skill shadcn (từ github.com/shadcn/ui)
rm -rf /tmp/shadcn-ui
if git clone -q --depth 1 --filter=blob:none --sparse https://github.com/shadcn/ui /tmp/shadcn-ui \
  && git -C /tmp/shadcn-ui sparse-checkout set skills/shadcn; then
  mkdir -p ~/.claude/skills && rm -rf ~/.claude/skills/shadcn && cp -r /tmp/shadcn-ui/skills/shadcn ~/.claude/skills/
fi
rm -rf /tmp/shadcn-ui
true
