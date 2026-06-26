import type { Column, Row, Sheet, SheetData, Workspace } from "./types";
import { buildSeedData, COLUMNS, TOTAL_ROWS } from "./seed";

const WS_KEY = "hyebin-sponsorships:workspace:v3";
const V2_KEY = "hyebin-sponsorships:data:v2";
const V1_KEY = "hyebin-sponsorships:rows:v1";

export function cloneColumns(cols: Column[]): Column[] {
  return cols.map((c) => ({
    ...c,
    options: c.options ? c.options.map((o) => ({ ...o })) : undefined,
  }));
}

function blankRow(columns: Column[]): Row {
  const row: Row = { id: newRowId() };
  for (const col of columns) row[col.key] = null;
  return row;
}

function padRows(rows: Row[], columns: Column[]): Row[] {
  const out = [...rows];
  while (out.length < TOTAL_ROWS) out.push(blankRow(columns));
  return out;
}

export function newRowId(): string {
  return `row-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function newColumnKey(): string {
  return `col-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function newSheetId(): string {
  return `sheet-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function emptyRow(columns: Column[]): Row {
  return blankRow(columns);
}

/** 시드 데이터로 시트 하나를 담은 워크스페이스 */
function seedWorkspace(): Workspace {
  const data = buildSeedData();
  const sheet: Sheet = {
    id: newSheetId(),
    name: "협찬 관리",
    columns: cloneColumns(data.columns),
    rows: data.rows,
  };
  return { sheets: [sheet], activeId: sheet.id };
}

/** 기본 컬럼 + 빈 행으로 새 시트 생성 */
export function createBlankSheet(name: string): Sheet {
  const columns = cloneColumns(COLUMNS);
  return {
    id: newSheetId(),
    name,
    columns,
    rows: padRows([], columns),
  };
}

function wrapSheetData(data: SheetData, name: string): Workspace {
  const sheet: Sheet = {
    id: newSheetId(),
    name,
    columns: cloneColumns(data.columns),
    rows: data.rows,
  };
  return { sheets: [sheet], activeId: sheet.id };
}

/**
 * 워크스페이스를 불러온다. v2(단일 시트)·v1(행만)에서 자동 마이그레이션.
 */
export function loadWorkspace(): Workspace {
  if (typeof window === "undefined") return seedWorkspace();
  try {
    const raw = window.localStorage.getItem(WS_KEY);
    if (raw) {
      const ws = JSON.parse(raw) as Workspace;
      if (ws && Array.isArray(ws.sheets) && ws.sheets.length > 0) {
        const activeId = ws.sheets.some((s) => s.id === ws.activeId)
          ? ws.activeId
          : ws.sheets[0].id;
        return { sheets: ws.sheets, activeId };
      }
    }
    const v2 = window.localStorage.getItem(V2_KEY);
    if (v2) {
      const parsed = JSON.parse(v2) as SheetData;
      if (parsed && Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
        return wrapSheetData(parsed, "협찬 관리");
      }
    }
    const v1 = window.localStorage.getItem(V1_KEY);
    if (v1) {
      const rows = JSON.parse(v1) as Row[];
      if (Array.isArray(rows)) {
        return wrapSheetData(
          { columns: COLUMNS, rows: padRows(rows, COLUMNS) },
          "협찬 관리",
        );
      }
    }
  } catch {
    // 손상된 데이터는 무시하고 시드로 시작
  }
  return seedWorkspace();
}

export function saveWorkspace(ws: Workspace): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WS_KEY, JSON.stringify(ws));
  } catch {
    // 저장 실패는 조용히 무시 (용량 초과 등)
  }
}
