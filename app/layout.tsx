import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "혜빈이의 협찬 관리 🎀",
  description: "인스타그램 광고/협찬 진행 상황 관리 스프레드시트",
  // 홈 화면에 추가 시 Safari UI 없이 앱처럼 실행
  appleWebApp: {
    capable: true,
    title: "협찬 관리",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff1f5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
