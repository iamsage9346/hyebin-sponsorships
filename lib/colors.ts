import type { TagColor } from "./types";

/** select 태그(pill) 색상 매핑 */
export const TAG_STYLES: Record<TagColor, string> = {
  pink: "bg-pink-100 text-pink-800",
  khaki: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-700",
  gray: "bg-gray-100 text-gray-600",
};

/** 옵션 색상 선택용 점(dot) 스타일 */
export const DOT_STYLES: Record<TagColor, string> = {
  pink: "bg-pink-400",
  khaki: "bg-amber-500",
  red: "bg-red-400",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  gray: "bg-gray-400",
};

/** 옵션 자동 생성·색상 순환에 쓰는 팔레트 순서 */
export const TAG_COLORS: TagColor[] = [
  "pink",
  "khaki",
  "green",
  "yellow",
  "red",
  "gray",
];

/** "미촬영"처럼 강조가 필요한 행 배경용 (연빨강) */
export const ROW_HIGHLIGHT = "bg-red-50/60";
