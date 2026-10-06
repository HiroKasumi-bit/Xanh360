import type { Metadata } from "next";
import "./globals.css";
import "./visuals.css";

export const metadata: Metadata = {
  title: "Xanh360 | Phân loại rác, không khí & thời tiết",
  description: "Phân loại rác tại TP. Hồ Chí Minh theo hướng dẫn có nguồn, tìm điểm tiếp nhận và tham khảo thông tin không khí và thời tiết.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
