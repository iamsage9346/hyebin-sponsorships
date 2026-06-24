import type {
  Column,
  FilterState,
  Row,
  SortState,
} from "./types";

export function emptyFilter(): FilterState {
  return { selected: {}, search: {}, range: {} };
}

export function hasActiveFilter(f: FilterState): boolean {
  const anySelected = Object.values(f.selected).some((v) => v && v.length > 0);
  const anySearch = Object.values(f.search).some((v) => v && v.trim() !== "");
  const anyRange = Object.values(f.range).some(
    (v) => v && (v.min !== null || v.max !== null),
  );
  return anySelected || anySearch || anyRange;
}

function cellText(v: Row[string]): string {
  return v === null || v === undefined ? "" : String(v);
}

export function applyFilter(
  rows: Row[],
  columns: Column[],
  filter: FilterState,
): Row[] {
  return rows.filter((row) => {
    for (const col of columns) {
      if (col.type === "select") {
        const sel = filter.selected[col.key];
        if (sel && sel.length > 0) {
          const v = cellText(row[col.key]);
          if (!sel.includes(v)) return false;
        }
      } else if (col.type === "number") {
        const rng = filter.range[col.key];
        if (rng && (rng.min !== null || rng.max !== null)) {
          const raw = row[col.key];
          const n = Number(cellText(raw).replace(/,/g, ""));
          if (cellText(raw) === "" || Number.isNaN(n)) return false;
          if (rng.min !== null && n < rng.min) return false;
          if (rng.max !== null && n > rng.max) return false;
        }
      } else {
        const term = filter.search[col.key];
        if (term && term.trim() !== "") {
          const v = cellText(row[col.key]).toLowerCase();
          if (!v.includes(term.trim().toLowerCase())) return false;
        }
      }
    }
    return true;
  });
}

export function applySort(
  rows: Row[],
  columns: Column[],
  sort: SortState | null,
): Row[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.key === sort.key);
  if (!col) return rows;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    // 빈 값은 항상 뒤로
    const aEmpty = av === null || av === "" || av === undefined;
    const bEmpty = bv === null || bv === "" || bv === undefined;
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    let cmp: number;
    if (col.type === "number") {
      cmp = Number(av) - Number(bv);
    } else {
      cmp = String(av).localeCompare(String(bv), "ko");
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export interface Summary {
  total: number;
  shown: number;
  feeTotal: number;
  paidTotal: number;
  unpaidTotal: number;
}

/** id 외에 값이 하나라도 채워진 행인지 */
function isFilled(row: Row): boolean {
  for (const k in row) {
    if (k === "id") continue;
    const v = row[k];
    if (v !== null && v !== undefined && v !== "") return true;
  }
  return false;
}

export function computeSummary(allRows: Row[], shownRows: Row[]): Summary {
  let feeTotal = 0;
  let paidTotal = 0;
  let unpaidTotal = 0;
  for (const row of shownRows) {
    const fee = Number(row.adFee);
    if (!Number.isNaN(fee) && row.adFee !== null && row.adFee !== "") {
      feeTotal += fee;
      if (row.paymentStatus === "입금완료") paidTotal += fee;
      else if (row.paymentStatus === "미입금") unpaidTotal += fee;
    }
  }
  return {
    total: allRows.filter(isFilled).length,
    shown: shownRows.filter(isFilled).length,
    feeTotal,
    paidTotal,
    unpaidTotal,
  };
}

export function formatWon(n: number): string {
  return n.toLocaleString("ko-KR");
}
