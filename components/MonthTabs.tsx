"use client";

import { useMemo } from "react";
import type { Row } from "@/lib/types";
import { parseDate } from "@/lib/date";

interface Props {
  rows: Row[];
  /** 월을 나누는 기준 날짜 컬럼 key (업로드일) */
  dateKey: string | null;
  /** 선택된 월 "2026.06" · null이면 전체 */
  active: string | null;
  onSelect: (month: string | null) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 업로드일 기준 월별 탭. 누르면 그 달 업로드 건만 표에 보인다. */
export function MonthTabs({ rows, dateKey, active, onSelect }: Props) {
  const months = useMemo(() => {
    const set = new Set<string>();
    if (dateKey) {
      for (const r of rows) {
        const v = r[dateKey];
        if (typeof v === "string") {
          const d = parseDate(v);
          if (d) set.add(`${d.y}.${pad(d.m + 1)}`);
        }
      }
    }
    // 항상 이번 달 탭은 보이게
    const now = new Date();
    set.add(`${now.getFullYear()}.${pad(now.getMonth() + 1)}`);
    return [...set].sort();
  }, [rows, dateKey]);

  // 여러 해가 섞이면 연도를 함께 표시해 구분
  const multiYear = useMemo(
    () => new Set(months.map((m) => m.split(".")[0])).size > 1,
    [months],
  );

  const tabClass = (on: boolean) =>
    `shrink-0 rounded-full border-2 px-3 py-1 text-sm font-medium ${
      on
        ? "border-pink-400 bg-white text-pink-600"
        : "border-transparent text-gray-400 hover:bg-pink-50"
    }`;

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={tabClass(active === null)}
      >
        전체
      </button>
      {months.map((m) => {
        const [yy, mm] = m.split(".");
        return (
          <button
            key={m}
            type="button"
            onClick={() => onSelect(m)}
            className={tabClass(active === m)}
            title={`${m} 업로드 건만 보기`}
          >
            {multiYear ? `${yy.slice(2)}.${Number(mm)}월` : `${Number(mm)}월`}
          </button>
        );
      })}
    </div>
  );
}
