"use client";

import { useMemo, useState } from "react";
import type { Column, Row } from "@/lib/types";
import { parseDate } from "@/lib/date";
import { formatWon } from "@/lib/sheet";

interface Props {
  columns: Column[];
  rows: Row[];
  /** 월을 나누는 기준 날짜 컬럼 key (없으면 비활성) */
  dateKey: string | null;
  /** 현재 필터로 선택된 월 (예: "2026.06") */
  activeMonth: string | null;
  onPickMonth: (month: string) => void;
}

interface Group {
  key: string; // "2026.06" 또는 "미분류"
  fee: number;
  paid: number;
  unpaid: number;
  count: number;
}

const UNCLASSIFIED = "미분류";

function isFilled(row: Row): boolean {
  for (const k in row) {
    if (k === "id") continue;
    const v = row[k];
    if (v !== null && v !== undefined && v !== "") return true;
  }
  return false;
}

export function MonthlySummary({
  columns,
  rows,
  dateKey,
  activeMonth,
  onPickMonth,
}: Props) {
  const [open, setOpen] = useState(true);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const row of rows) {
      if (!isFilled(row)) continue;
      const d =
        dateKey && typeof row[dateKey] === "string"
          ? parseDate(row[dateKey] as string)
          : null;
      const key = d
        ? `${d.y}.${String(d.m + 1).padStart(2, "0")}`
        : UNCLASSIFIED;
      const g = map.get(key) ?? { key, fee: 0, paid: 0, unpaid: 0, count: 0 };
      const fee = Number(row.adFee);
      if (!Number.isNaN(fee) && row.adFee !== null && row.adFee !== "") {
        g.fee += fee;
        if (row.paymentStatus === "입금완료") g.paid += fee;
        else if (row.paymentStatus === "미입금") g.unpaid += fee;
      }
      g.count += 1;
      map.set(key, g);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (a.key === UNCLASSIFIED) return 1;
      if (b.key === UNCLASSIFIED) return -1;
      return a.key.localeCompare(b.key);
    });
    return arr;
  }, [rows, dateKey]);

  const totals = useMemo(
    () =>
      groups.reduce(
        (acc, g) => ({
          fee: acc.fee + g.fee,
          paid: acc.paid + g.paid,
          unpaid: acc.unpaid + g.unpaid,
          count: acc.count + g.count,
        }),
        { fee: 0, paid: 0, unpaid: 0, count: 0 },
      ),
    [groups],
  );

  const dateColLabel =
    columns.find((c) => c.key === dateKey)?.label ?? "입금일";

  return (
    <section className="mb-4 rounded-lg border border-gray-200 bg-white px-3 py-3 sm:px-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold sm:text-base">
          월별 정산{" "}
          <span className="font-normal text-gray-400">({dateColLabel} 기준)</span>
        </h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          {open ? "접기" : "펼치기"}
        </button>
      </div>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="px-2 py-1.5 text-left font-medium">월</th>
                <th className="px-2 py-1.5 text-right font-medium">광고비</th>
                <th className="px-2 py-1.5 text-right font-medium">입금완료</th>
                <th className="px-2 py-1.5 text-right font-medium">미입금</th>
                <th className="px-2 py-1.5 text-right font-medium">건수</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-gray-400">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
              {groups.map((g) => {
                const clickable = g.key !== UNCLASSIFIED;
                const active = activeMonth === g.key;
                return (
                  <tr
                    key={g.key}
                    onClick={() => clickable && onPickMonth(g.key)}
                    className={`border-b border-gray-100 ${
                      clickable ? "cursor-pointer hover:bg-blue-50" : ""
                    } ${active ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-2 py-1.5 font-medium">
                      {g.key}
                      {active && <span className="ml-1 text-xs text-blue-500">●</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatWon(g.fee)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-green-600">
                      {formatWon(g.paid)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-red-600">
                      {formatWon(g.unpaid)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-500">
                      {g.count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {groups.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-bold">
                  <td className="px-2 py-1.5">합계</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {formatWon(totals.fee)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-green-600">
                    {formatWon(totals.paid)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-red-600">
                    {formatWon(totals.unpaid)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-500">
                    {totals.count}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          {dateKey === null && (
            <p className="mt-2 text-xs text-gray-400">
              날짜 컬럼이 없어 월을 나눌 수 없습니다.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
