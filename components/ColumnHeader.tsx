"use client";

import { useEffect, useRef, useState } from "react";
import type { Column, ColumnType, SortState } from "@/lib/types";

const TYPE_LABELS: Record<ColumnType, string> = {
  text: "텍스트",
  number: "숫자",
  date: "날짜",
  select: "선택",
};
const EDITABLE_TYPES: ColumnType[] = ["text", "number", "date"];

interface Props {
  column: Column;
  sort: SortState | null;
  onToggleSort: (key: string) => void;
  onRename: (key: string, label: string) => void;
  onChangeType: (key: string, type: ColumnType) => void;
  onInsert: (key: string, side: "left" | "right") => void;
  onDelete: (key: string) => void;
}

export function ColumnHeader({
  column,
  sort,
  onToggleSort,
  onRename,
  onChangeType,
  onInsert,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(column.label);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setName(column.label), [column.label]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onRename(column.key, name);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, name, column.key, onRename]);

  const sortArrow =
    sort?.key === column.key ? (sort.dir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="relative flex items-center justify-between gap-1" ref={ref}>
      <button
        type="button"
        onClick={() => onToggleSort(column.key)}
        className="flex-1 truncate text-left hover:text-black"
        title="클릭하여 정렬"
      >
        {column.label || " "}
        <span className="text-gray-400">{sortArrow}</span>
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="shrink-0 rounded px-1 text-gray-300 hover:text-gray-600"
        title="컬럼 설정"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-30 w-52 rounded-md border border-gray-200 bg-white p-2 text-gray-700 shadow-lg">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRename(column.key, name);
                setOpen(false);
              }
            }}
            placeholder="컬럼 이름"
            className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-400"
          />
          <div className="mb-1 px-1 text-xs font-semibold text-gray-400">타입</div>
          <div className="mb-2 flex gap-1">
            {EDITABLE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChangeType(column.key, t)}
                className={`flex-1 rounded border px-1 py-1 text-xs ${
                  column.type === t
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {column.type === "select" && (
            <div className="mb-2 px-1 text-xs text-gray-400">
              선택형 컬럼 (타입 고정)
            </div>
          )}
          <div className="border-t border-gray-100 pt-1">
            <MenuItem
              onClick={() => {
                onInsert(column.key, "left");
                setOpen(false);
              }}
            >
              ← 왼쪽에 컬럼 삽입
            </MenuItem>
            <MenuItem
              onClick={() => {
                onInsert(column.key, "right");
                setOpen(false);
              }}
            >
              오른쪽에 컬럼 삽입 →
            </MenuItem>
            <MenuItem
              danger
              onClick={() => {
                onDelete(column.key);
                setOpen(false);
              }}
            >
              컬럼 삭제
            </MenuItem>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-50 ${
        danger ? "text-red-600" : ""
      }`}
    >
      {children}
    </button>
  );
}
