"use client";

import { useMemo, useState } from "react";
import type { Column, Row, SelectOption } from "@/lib/types";
import { EVENT_COLORS } from "@/lib/colors";
import { parseDate } from "@/lib/date";
import { Tag } from "./Tag";

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
  row: Row;
}

/** 상단의 큰 월 캘린더 — 날짜 컬럼(입금일·업로드 등)을 색상별 이벤트로 표시 */
export function CalendarView({ columns, rows }: Props) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

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
          row,
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

  const prev = () => {
    setSelectedDay(null);
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  };
  const next = () => {
    setSelectedDay(null);
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  };
  const goToday = () => {
    setView({ y: now.getFullYear(), m: now.getMonth() });
    setSelectedDay(now.getDate());
  };

  const dayEvents = selectedDay !== null ? eventsByDay.get(selectedDay) ?? [] : [];
  const selWeekday =
    selectedDay !== null
      ? WEEKDAYS[new Date(view.y, view.m, selectedDay).getDay()]
      : "";

  return (
    <section className="mb-4 rounded-2xl border border-pink-100 bg-white px-1.5 py-3 shadow-sm shadow-pink-50 sm:px-4 sm:py-4">
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

          {/* 날짜 격자 (가로 구분선만, 세로선 없음) */}
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const evs = d ? eventsByDay.get(d) ?? [] : [];
              const isToday = d === today;
              const isSelected = d !== null && d === selectedDay;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={d === null}
                  onClick={() => d !== null && setSelectedDay(d)}
                  className={`min-h-[58px] border-t border-gray-100 px-0.5 pt-1 pb-0.5 text-left align-top sm:min-h-[92px] ${
                    isSelected ? "rounded-md ring-1 ring-inset ring-gray-300" : ""
                  }`}
                >
                  {d !== null && (
                    <>
                      <div
                        className={`mb-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-xs ${
                          isToday
                            ? "bg-blue-600 px-1 font-bold text-white"
                            : "text-gray-500"
                        }`}
                      >
                        {d}
                      </div>
                      {/* 모바일: 색 점 / 데스크탑: 칩 */}
                      <div className="flex flex-wrap gap-0.5 sm:hidden">
                        {evs.slice(0, 4).map((ev, j) => (
                          <span
                            key={j}
                            className={`h-1.5 w-1.5 rounded-full ${EVENT_COLORS[ev.colorIdx].dot}`}
                          />
                        ))}
                      </div>
                      <div className="hidden flex-col gap-0.5 sm:flex">
                        {evs.slice(0, 4).map((ev, j) => (
                          <div
                            key={j}
                            className={`truncate rounded px-1 py-0.5 text-[11px] leading-tight ${
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
                </button>
              );
            })}
          </div>

          {/* 선택한 날짜의 협찬 상세 */}
          {selectedDay !== null && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="mb-2 text-sm font-semibold text-gray-800">
                {view.y}.{String(view.m + 1).padStart(2, "0")}.
                {String(selectedDay).padStart(2, "0")}{" "}
                <span className="text-gray-400">({selWeekday})</span>
              </div>
              {dayEvents.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  이 날짜의 협찬 일정이 없습니다.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {dayEvents.map((ev, i) => (
                    <DayEventCard key={i} ev={ev} columns={columns} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function DayEventCard({ ev, columns }: { ev: Ev; columns: Column[] }) {
  const tags = columns
    .filter((c) => c.type === "select")
    .map((c) => {
      const v = ev.row[c.key];
      const opt = c.options?.find((o) => o.value === v);
      return opt ? { key: c.key, opt } : null;
    })
    .filter(Boolean) as { key: string; opt: SelectOption }[];

  const product = columns.find((c) => c.key === "product");
  const productVal = product ? ev.row[product.key] : null;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 p-2.5">
      <span
        className={`mt-1 h-3 w-3 shrink-0 rounded-full ${EVENT_COLORS[ev.colorIdx].dot}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-gray-900">{ev.title}</span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
            {ev.colLabel}
          </span>
        </div>
        {productVal ? (
          <div className="mt-0.5 truncate text-sm text-gray-500">
            {String(productVal)}
          </div>
        ) : null}
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((t) => (
              <Tag key={t.key} option={t.opt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
