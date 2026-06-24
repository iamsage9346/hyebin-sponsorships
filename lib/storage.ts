import type { Row, SheetData } from "./types";
import { buildSeedData, COLUMNS } from "./seed";

const STORAGE_KEY = "hyebin-sponsorships:rows:v1";

/**
 * 컬럼 스키마는 코드(COLUMNS)에서 가져오고, 사용자가 편집하는 행만
 * localStorage에 저장한다. 스키마가 바뀌어도 데이터가 깨지지 않는다.
 */
export function loadData(): SheetData {
  if (typeof window === "undefined") return buildSeedData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeedData();
    const rows = JSON.parse(raw) as Row[];
    if (!Array.isArray(rows)) return buildSeedData();
    return { columns: COLUMNS, rows };
  } catch {
    return buildSeedData();
  }
}

export function saveRows(rows: Row[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // 저장 실패는 조용히 무시 (용량 초과 등)
  }
}

export function newRowId(): string {
  return `row-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function emptyRow(): Row {
  const row: Row = { id: newRowId() };
  for (const col of COLUMNS) row[col.key] = null;
  return row;
}
