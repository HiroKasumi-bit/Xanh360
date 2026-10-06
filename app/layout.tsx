import type { Metadata, Viewport } from "next";
// Be Vietnam Pro, self-hosted: only the vietnamese + latin subsets for the weights in use (400–800).
// These subset files carry no unicode-range, so the face declared last is tried first for every
// character; latin goes last so plain text stays in one face and only Vietnamese letters (ạ, ệ, Đ, ơ…)
// fall through to the vietnamese face.
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-500.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/latin-700.css";
import "@fontsource/be-vietnam-pro/latin-800.css";
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

// viewport-fit=cover lets the page run under notches and the home indicator; the bottom tab bar, sheets and page gutters
// pad themselves with env(safe-area-inset-*). The theme colour is the paper background, so the browser chrome blends in.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f5ef",
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
