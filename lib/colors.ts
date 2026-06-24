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

/** "미촬영"처럼 강조가 필요한 행 배경용 (연빨강) */
export const ROW_HIGHLIGHT = "bg-red-50/60";
