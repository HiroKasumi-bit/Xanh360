import type { Metadata, Viewport } from "next";
// Be Vietnam Pro, self-hosted: only the latin + vietnamese subsets for the weights in use (400–800).
// These subset files carry no unicode-range, so for every character the browser tries the face declared last first.
// Vietnamese is imported last on purpose: its precomposed letters (ạ, ệ, ỗ, Đ, ơ…) then come straight from the vietnamese
// face, and everything that face lacks (plain a–z, digits, punctuation) falls through to latin. In the other order the
// latin face is tried first and the browser decomposes letters such as ỗ into marks it stacks wrongly ("chỗ" read "chố̃").
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-500.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/latin-700.css";
import "@fontsource/be-vietnam-pro/latin-800.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
import "@fontsource/be-vietnam-pro/vietnamese-800.css";
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

// The single source of truth for reduced motion. This runs in <head>, before the first paint, and sets
// html[data-motion] to "reduced" when the system asks for less motion or the visitor chose "Dừng hiệu ứng" earlier
// (saved under xanh360-motion), otherwise "full". data-motion-source says why ("system", "user" or "none"), so the
// header can explain a system setting instead of offering a toggle. CSS reads only these attributes; MotionControl
// (app/eco-visual.tsx) keeps them in sync afterwards. React does not own these attributes, hence suppressHydrationWarning.
const motionScript = `(function(){var d=document.documentElement,s=false,p=null;try{s=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}try{p=localStorage.getItem('xanh360-motion')}catch(e){}d.setAttribute('data-motion',s||p==='paused'?'reduced':'full');d.setAttribute('data-motion-source',s?'system':p==='paused'?'user':'none')})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
