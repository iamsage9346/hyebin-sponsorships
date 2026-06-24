"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function initView(value: string | null): { y: number; m: number } {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  if (value) {
    const match = value.match(/(\d{1,2})\s*월/);
    if (match) {
      const mm = parseInt(match[1], 10) - 1;
      if (mm >= 0 && mm <= 11) m = mm;
    }
  }
  return { y, m };
}

interface Props {
  value: string | null;
  onPick: (v: string) => void;
  onClose: () => void;
}

/** 날짜 셀 클릭 시 뜨는 작은 월 달력. 선택하면 "M월 D" 형식으로 저장 */
export function Calendar({ value, onPick, onClose }: Props) {
  const [view, setView] = useState(() => initView(value));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const startDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedDay = (() => {
    if (!value) return null;
    const match = value.match(/월\s*(\d{1,2})/);
    return match ? parseInt(match[1], 10) : null;
  })();

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute left-0 top-full z-30 mt-1 w-56 rounded-md border border-gray-200 bg-white p-2 text-gray-800 shadow-lg"
    >
      <div className="mb-1 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() =>
            setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
          }
          className="rounded px-2 py-0.5 hover:bg-gray-100"
        >
          ‹
        </button>
        <span className="font-medium">
          {view.y}년 {view.m + 1}월
        </span>
        <button
          type="button"
          onClick={() =>
            setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))
          }
          className="rounded px-2 py-0.5 hover:bg-gray-100"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-gray-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-0.5">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
        {cells.map((d, i) =>
          d === null ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => onPick(`${view.m + 1}월 ${d}`)}
              className={`rounded py-1 hover:bg-blue-100 ${
                d === selectedDay ? "bg-blue-500 text-white hover:bg-blue-500" : ""
              }`}
            >
              {d}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        onClick={() => onPick("")}
        className="mt-1 w-full rounded py-1 text-xs text-gray-400 hover:bg-gray-50"
      >
        비우기
      </button>
    </div>
  );
}
