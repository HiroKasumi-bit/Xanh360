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
import { applyDaypart } from "./daypart";

export const metadata: Metadata = {
  title: "Xanh360 | Phân loại rác, không khí & thời tiết",
  description: "Phân loại rác tại TP. Hồ Chí Minh theo hướng dẫn có nguồn, tìm điểm tiếp nhận và tham khảo thông tin không khí và thời tiết.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

// viewport-fit=cover lets the page run under notches and the home indicator; the bottom tab bar, sheets and page gutters
// pad themselves with env(safe-area-inset-*). The theme colour is set in <head> below, so the daypart script can turn the
// browser chrome to the sky of the hour.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// The single source of truth for reduced motion. This runs in <head>, before the first paint, and sets
// html[data-motion] to "reduced" when the system asks for less motion, otherwise "full", and follows the system
// setting if it changes while the page is open. CSS and app/motion.ts read only this attribute. React does not own it,
// hence suppressHydrationWarning.
const motionScript = `(function(){var d=document.documentElement;try{var m=window.matchMedia('(prefers-reduced-motion: reduce)');var set=function(){d.setAttribute('data-motion',m.matches?'reduced':'full')};set();m.addEventListener('change',set)}catch(e){d.setAttribute('data-motion','full')}})()`;

// The hero's photograph and the sky wash follow the hour in Ho Chi Minh City (app/daypart.ts): html[data-daypart] and the
// theme colour are set here, before the first paint, so the CSS asks for the right picture straight away. The meta tag
// starts on the day sky and must come before the script, which looks it up.
const daypartScript = `(${applyDaypart.toString()})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#b9d5ec" />
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
        <script dangerouslySetInnerHTML={{ __html: daypartScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
