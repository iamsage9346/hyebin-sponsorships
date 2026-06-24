import type { Column, Row, SheetData } from "./types";
import { buildSeedData, COLUMNS, TOTAL_ROWS } from "./seed";

const STORAGE_KEY = "hyebin-sponsorships:data:v2";
const LEGACY_ROWS_KEY = "hyebin-sponsorships:rows:v1";

function blankRow(columns: Column[]): Row {
  const row: Row = { id: newRowId() };
  for (const col of columns) row[col.key] = null;
  return row;
}

/** 최소 TOTAL_ROWS개가 되도록 빈 행을 채운다 */
function padRows(rows: Row[], columns: Column[]): Row[] {
  const out = [...rows];
  while (out.length < TOTAL_ROWS) out.push(blankRow(columns));
  return out;
}

/**
 * 컬럼·행 구조를 모두 localStorage에 저장한다.
 * v1(행만 저장) 데이터가 있으면 한 번만 마이그레이션한다.
 */
export function loadData(): SheetData {
  if (typeof window === "undefined") return buildSeedData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SheetData;
      if (
        parsed &&
        Array.isArray(parsed.columns) &&
        Array.isArray(parsed.rows)
      ) {
        return { columns: parsed.columns, rows: parsed.rows };
      }
    }
    // v1 → v2 마이그레이션 (행만 저장돼 있던 경우)
    const legacy = window.localStorage.getItem(LEGACY_ROWS_KEY);
    if (legacy) {
      const rows = JSON.parse(legacy) as Row[];
      if (Array.isArray(rows)) {
        return { columns: COLUMNS, rows: padRows(rows, COLUMNS) };
      }
    }
  } catch {
    // 손상된 데이터는 무시하고 시드로 시작
  }
  return buildSeedData();
}

export function saveData(data: SheetData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 저장 실패는 조용히 무시 (용량 초과 등)
  }
}

export function newRowId(): string {
  return `row-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function newColumnKey(): string {
  return `col-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function emptyRow(columns: Column[]): Row {
  return blankRow(columns);
}
