import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "광고 협찬 관리",
  description: "인스타그램 광고/협찬 진행 상황 관리 스프레드시트",
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
