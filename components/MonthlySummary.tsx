"use client";

import { useMemo } from "react";
import type { Column, Row } from "@/lib/types";
import { parseDate } from "@/lib/date";
import { formatWon } from "@/lib/sheet";

interface Props {
  columns: Column[];
  rows: Row[];
  /** 월을 나누는 기준 날짜 컬럼 key */
  dateKey: string | null;
  year: number;
  month: number; // 0-based
  isFiltered: boolean;
  onToggleFilter: () => void;
}

function isFilled(row: Row): boolean {
  for (const k in row) {
    if (k === "id") continue;
    const v = row[k];
    if (v !== null && v !== undefined && v !== "") return true;
  }
  return false;
}

/** 캘린더가 보고 있는 달의 정산 요약 (캘린더 이동에 따라 바뀜) */
export function MonthlySummary({
  columns,
  rows,
  dateKey,
  year,
  month,
  isFiltered,
  onToggleFilter,
}: Props) {
  const stat = useMemo(() => {
    let fee = 0;
    let paid = 0;
    let unpaid = 0;
    let count = 0;
    for (const row of rows) {
      if (!isFilled(row)) continue;
      const d =
        dateKey && typeof row[dateKey] === "string"
          ? parseDate(row[dateKey] as string)
          : null;
      if (!d || d.y !== year || d.m !== month) continue;
      count += 1;
      const f = Number(row.adFee);
      if (!Number.isNaN(f) && row.adFee !== null && row.adFee !== "") {
        fee += f;
        if (row.paymentStatus === "입금완료") paid += f;
        else if (row.paymentStatus === "미입금") unpaid += f;
      }
    }
    return { fee, paid, unpaid, count };
  }, [rows, dateKey, year, month]);

  const dateColLabel = columns.find((c) => c.key === dateKey)?.label ?? "날짜";

  return (
    <section className="mb-4 rounded-2xl border border-pink-100 bg-white px-3 py-3 shadow-sm shadow-pink-50 sm:px-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold sm:text-base">
          {year}.{String(month + 1).padStart(2, "0")} 정산{" "}
          <span className="font-normal text-gray-400">({dateColLabel} 기준)</span>
        </h2>
        <button
          type="button"
          onClick={onToggleFilter}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            isFiltered
              ? "bg-pink-500 text-white"
              : "border border-gray-300 text-gray-500 hover:bg-gray-50"
          }`}
        >
          {isFiltered ? "전체 보기" : "이 달만 보기"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="광고비" value={formatWon(stat.fee)} />
        <Stat label="입금완료" value={formatWon(stat.paid)} color="text-green-600" />
        <Stat label="미입금" value={formatWon(stat.unpaid)} color="text-rose-500" />
        <Stat label="건수" value={`${stat.count}`} color="text-gray-700" />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  color = "text-gray-900",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`mt-0.5 text-sm font-bold tabular-nums sm:text-base ${color}`}>
        {value}
      </div>
    </div>
  );
}
