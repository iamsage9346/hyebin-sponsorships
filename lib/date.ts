/** 날짜 표현 (m은 0-based 월) */
export interface YMD {
  y: number;
  m: number;
  d: number;
}

/** "2026.05.03", "2026-05-03", 구버전 "5월 3"(연도 2026 가정)을 파싱 */
export function parseDate(s: string | null | undefined): YMD | null {
  if (!s) return null;
  const str = String(s).trim();
  let m = str.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (m) return { y: +m[1], m: +m[2] - 1, d: +m[3] };
  m = str.match(/(\d{1,2})\s*월\s*(\d{1,2})/);
  if (m) return { y: 2026, m: +m[1] - 1, d: +m[2] };
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** YMD → "2026.05.03" */
export function formatYMD(o: YMD): string {
  return `${o.y}.${pad(o.m + 1)}.${pad(o.d)}`;
}
