import type { CellValue, Column, Row } from "./types";

/** 컬럼 인덱스 → 엑셀식 문자 (0→A, 25→Z, 26→AA) */
export function indexToLetters(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function lettersToIndex(s: string): number {
  let n = 0;
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function toNum(v: CellValue): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

export function isFormula(v: CellValue): boolean {
  return typeof v === "string" && v.trim().startsWith("=");
}

export interface CellDisplay {
  text: string;
  error: boolean;
  isFormula: boolean;
}

function formatNum(v: number): string {
  return v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

/**
 * 표시용 격자(columns × rows)에 대한 수식 평가기.
 * 참조는 보이는 격자 기준(열 문자 = 컬럼 위치, 행 번호 = 표시 순서).
 */
export function makeEvaluator(columns: Column[], rows: Row[]) {
  const cache = new Map<string, number>();
  const stack = new Set<string>();

  const rawAt = (r: number, c: number): CellValue => {
    const col = columns[c];
    const row = rows[r];
    if (!col || !row) return null;
    const v = row[col.key];
    return v === undefined ? null : v;
  };

  function evalRef(r: number, c: number): number {
    const key = r + ":" + c;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    if (stack.has(key)) throw new Error("CIRC");
    const raw = rawAt(r, c);
    let result: number;
    if (isFormula(raw)) {
      stack.add(key);
      try {
        result = evalExpr((raw as string).trim().slice(1), r);
      } finally {
        stack.delete(key);
      }
    } else {
      result = toNum(raw);
    }
    cache.set(key, result);
    return result;
  }

  function evalExpr(expr: string, curRow: number): number {
    // 1) SUM/AVERAGE(범위)
    let e = expr.replace(
      /\b(SUM|AVERAGE)\s*\(\s*([A-Za-z]+)(\d+)\s*:\s*([A-Za-z]+)(\d+)\s*\)/gi,
      (_m, fn, l1, r1, l2, r2) => {
        const c1 = lettersToIndex(l1);
        const c2 = lettersToIndex(l2);
        const rr1 = parseInt(r1, 10) - 1;
        const rr2 = parseInt(r2, 10) - 1;
        let sum = 0;
        let count = 0;
        for (let rr = Math.min(rr1, rr2); rr <= Math.max(rr1, rr2); rr++)
          for (let cc = Math.min(c1, c2); cc <= Math.max(c1, c2); cc++) {
            sum += evalRef(rr, cc);
            count++;
          }
        return String(fn.toUpperCase() === "SUM" ? sum : count ? sum / count : 0);
      },
    );
    // 2) 절대 셀 참조 (D2)
    e = e.replace(/([A-Za-z]+)(\d+)/g, (_m, L, R) =>
      String(evalRef(parseInt(R, 10) - 1, lettersToIndex(L))),
    );
    // 3) 같은 행 열 참조 (D)
    e = e.replace(/[A-Za-z]+/g, (L) => String(evalRef(curRow, lettersToIndex(L))));
    // 4) 안전 검사 후 산술 평가
    if (!/^[0-9+\-*/(). ]*$/.test(e)) throw new Error("SYNTAX");
    if (e.trim() === "") return 0;
    const val = Function('"use strict"; return (' + e + ")")();
    if (typeof val !== "number" || !Number.isFinite(val)) throw new Error("NaN");
    return val;
  }

  function display(r: number, c: number): CellDisplay {
    const raw = rawAt(r, c);
    if (!isFormula(raw)) {
      return {
        text: raw === null || raw === undefined ? "" : String(raw),
        error: false,
        isFormula: false,
      };
    }
    try {
      return { text: formatNum(evalRef(r, c)), error: false, isFormula: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ERR";
      return {
        text: msg === "CIRC" ? "#순환참조" : "#오류",
        error: true,
        isFormula: true,
      };
    }
  }

  return { display };
}
