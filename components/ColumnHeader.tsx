"use client";

import { useEffect, useRef, useState } from "react";
import type { Column, FilterState, SortState } from "@/lib/types";

interface Props {
  column: Column;
  filter: FilterState;
  sort: SortState | null;
  onToggleSort: (key: string) => void;
  onSelectChange: (key: string, values: string[]) => void;
  onSearchChange: (key: string, term: string) => void;
}

export function ColumnHeader({
  column,
  filter,
  sort,
  onToggleSort,
  onSelectChange,
  onSearchChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = filter.selected[column.key] ?? [];
  const search = filter.search[column.key] ?? "";
  const active =
    (column.type === "select" && selected.length > 0) ||
    (column.type !== "select" && search.trim() !== "");

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
        {column.label}
        <span className="text-gray-400">{sortArrow}</span>
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`shrink-0 rounded px-1 text-xs ${
          active ? "text-blue-600" : "text-gray-300 hover:text-gray-500"
        }`}
        title="필터"
      >
        ⛃
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-20 w-56 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
          {column.type === "select" ? (
            <div className="flex flex-col gap-1">
              <div className="px-1 pb-1 text-xs font-semibold text-gray-500">
                값 선택
              </div>
              {column.options?.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? selected.filter((v) => v !== opt.value)
                          : [...selected, opt.value];
                        onSelectChange(column.key, next);
                      }}
                    />
                    {opt.value}
                  </label>
                );
              })}
            </div>
          ) : (
            <input
              autoFocus
              type="text"
              value={search}
              placeholder="포함 검색…"
              onChange={(e) => onSearchChange(column.key, e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-400"
            />
          )}
        </div>
      )}
    </div>
  );
}
