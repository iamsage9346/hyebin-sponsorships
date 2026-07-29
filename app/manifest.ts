import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "혜빈이의 협찬 관리 🎀",
    short_name: "협찬 관리",
    description: "인스타그램 광고/협찬 진행 상황 관리 스프레드시트",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff1f5",
    theme_color: "#fff1f5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
