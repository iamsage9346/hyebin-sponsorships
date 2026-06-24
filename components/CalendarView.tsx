"use client";

import { useMemo, useState } from "react";
import type { Column, Row } from "@/lib/types";
import { EVENT_COLORS } from "@/lib/colors";
import { parseDate } from "@/lib/date";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface Props {
  columns: Column[];
  rows: Row[];
}

interface Ev {
  colKey: string;
  colLabel: string;
  colorIdx: number;
  title: string;
}

/** 상단의 큰 월 캘린더 — 날짜 컬럼(입금일·업로드 등)을 색상별 이벤트로 표시 */
export function CalendarView({ columns, rows }: Props) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(true);

  const dateCols = useMemo(
    () => columns.filter((c) => c.type === "date"),
    [columns],
  );

  // 제목으로 쓸 컬럼: brand 우선, 없으면 첫 텍스트 컬럼
  const titleKey = useMemo(() => {
    const brand = columns.find((c) => c.key === "brand");
    if (brand) return brand.key;
    return columns.find((c) => c.type === "text")?.key;
  }, [columns]);

  // 일자별 이벤트 맵
  const eventsByDay = useMemo(() => {
    const map = new Map<number, Ev[]>();
    dateCols.forEach((col, idx) => {
      if (hidden.has(col.key)) return;
      for (const row of rows) {
        const parsed = parseDate(
          typeof row[col.key] === "string" ? (row[col.key] as string) : null,
        );
        if (!parsed || parsed.y !== view.y || parsed.m !== view.m) continue;
        const title = titleKey ? String(row[titleKey] ?? "") : "";
        const list = map.get(parsed.d) ?? [];
        list.push({
          colKey: col.key,
          colLabel: col.label,
          colorIdx: idx % EVENT_COLORS.length,
          title: title || "(제목 없음)",
        });
        map.set(parsed.d, list);
      }
    });
    return map;
  }, [dateCols, rows, view, hidden, titleKey]);

  const startDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today =
    now.getFullYear() === view.y && now.getMonth() === view.m
      ? now.getDate()
      : null;

  const prev = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const next = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  const goToday = () => setView({ y: now.getFullYear(), m: now.getMonth() });

  return (
    <section className="mb-4 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={prev}
            className="rounded px-2 py-1 text-lg hover:bg-gray-100"
          >
            ‹
          </button>
          <h2 className="min-w-[110px] text-center text-lg font-bold sm:min-w-[140px] sm:text-xl">
            {view.y}.{String(view.m + 1).padStart(2, "0")}
          </h2>
          <button
            type="button"
            onClick={next}
            className="rounded px-2 py-1 text-lg hover:bg-gray-100"
          >
            ›
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            오늘
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
        >
          {open ? "캘린더 접기" : "캘린더 펼치기"}
        </button>
      </div>

      {open && (
        <>
          {/* 범례 (날짜 컬럼별 색상) */}
          <div className="mb-3 flex flex-wrap gap-2">
            {dateCols.map((col, idx) => {
              const off = hidden.has(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() =>
                    setHidden((h) => {
                      const n = new Set(h);
                      if (n.has(col.key)) n.delete(col.key);
                      else n.add(col.key);
                      return n;
                    })
                  }
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                    off
                      ? "border-gray-200 text-gray-300"
                      : "border-gray-300 text-gray-700"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      off ? "bg-gray-200" : EVENT_COLORS[idx % EVENT_COLORS.length].dot
                    }`}
                  />
                  {col.label}
                </button>
              );
            })}
            {dateCols.length === 0 && (
              <span className="text-xs text-gray-400">
                날짜 타입 컬럼이 없습니다.
              </span>
            )}
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`py-1 ${i === 0 ? "text-red-400" : ""} ${
                  i === 6 ? "text-blue-400" : ""
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* 날짜 격자 */}
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md bg-gray-100">
            {cells.map((d, i) => {
              const evs = d ? eventsByDay.get(d) ?? [] : [];
              const isToday = d === today;
              return (
                <div
                  key={i}
                  className={`min-h-[64px] bg-white p-1 sm:min-h-[96px] ${
                    d === null ? "bg-gray-50" : ""
                  }`}
                >
                  {d !== null && (
                    <>
                      <div
                        className={`mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                          isToday
                            ? "bg-blue-600 font-bold text-white"
                            : "text-gray-500"
                        }`}
                      >
                        {d}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {evs.slice(0, 4).map((ev, j) => (
                          <div
                            key={j}
                            className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight sm:text-[11px] ${
                              EVENT_COLORS[ev.colorIdx].chip
                            }`}
                            title={`${ev.colLabel}: ${ev.title}`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {evs.length > 4 && (
                          <div className="px-1 text-[10px] text-gray-400">
                            +{evs.length - 4}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
