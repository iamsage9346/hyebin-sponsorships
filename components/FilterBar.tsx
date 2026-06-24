"use client";

import { useEffect, useRef, useState } from "react";
import type { Column, ColumnType, FilterState } from "@/lib/types";

const TYPE_LABEL: Record<ColumnType, string> = {
  text: "텍스트",
  number: "숫자",
  date: "날짜",
  select: "선택",
};

function rangeSummary(rng?: { min: number | null; max: number | null }): string {
  if (!rng || (rng.min === null && rng.max === null)) return "…";
  if (rng.min !== null && rng.max !== null)
    return `${rng.min.toLocaleString()}~${rng.max.toLocaleString()}`;
  if (rng.min !== null) return `≥ ${rng.min.toLocaleString()}`;
  return `≤ ${rng.max!.toLocaleString()}`;
}

interface Props {
  columns: Column[];
  filterKeys: string[];
  filter: FilterState;
  onAddKey: (key: string) => void;
  onRemoveKey: (key: string) => void;
  onSelectChange: (key: string, values: string[]) => void;
  onSearchChange: (key: string, term: string) => void;
  onRangeChange: (
    key: string,
    range: { min: number | null; max: number | null },
  ) => void;
  onClearAll: () => void;
}

export function FilterBar({
  columns,
  filterKeys,
  filter,
  onAddKey,
  onRemoveKey,
  onSelectChange,
  onSearchChange,
  onRangeChange,
  onClearAll,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [openChip, setOpenChip] = useState<string | null>(null);

  const byKey = (k: string) => columns.find((c) => c.key === k);
  const available = columns.filter((c) => !filterKeys.includes(c.key));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 필터 추가 */}
      <Popover
        open={addOpen}
        onClose={() => setAddOpen(false)}
        trigger={
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <span>⛃</span> 필터
          </button>
        }
      >
        <div className="max-h-64 w-48 overflow-y-auto p-1">
          <div className="px-2 py-1 text-xs font-semibold text-gray-400">
            속성 선택
          </div>
          {available.length === 0 && (
            <div className="px-2 py-1 text-xs text-gray-400">
              모든 컬럼에 필터가 적용됨
            </div>
          )}
          {available.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                onAddKey(c.key);
                setAddOpen(false);
                setOpenChip(c.key);
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-50"
            >
              <span className="truncate">{c.label || "(이름 없음)"}</span>
              <span className="shrink-0 rounded bg-gray-100 px-1.5 text-[10px] text-gray-500">
                {TYPE_LABEL[c.type]}
              </span>
            </button>
          ))}
        </div>
      </Popover>

      {/* 활성 필터 칩 */}
      {filterKeys.map((key) => {
        const col = byKey(key);
        if (!col) return null;
        const selected = filter.selected[key] ?? [];
        const search = filter.search[key] ?? "";
        const range = filter.range[key] ?? { min: null, max: null };
        const summary =
          col.type === "select"
            ? selected.length > 0
              ? selected.join(", ")
              : "전체"
            : col.type === "number"
              ? rangeSummary(range)
              : search.trim() !== ""
                ? `"${search}"`
                : "…";
        return (
          <Popover
            key={key}
            open={openChip === key}
            onClose={() => setOpenChip(null)}
            trigger={
              <span className="flex items-center overflow-hidden rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-700">
                <button
                  type="button"
                  onClick={() => setOpenChip((k) => (k === key ? null : key))}
                  className="max-w-[200px] truncate px-2 py-1 hover:bg-blue-100"
                >
                  <span className="font-medium">{col.label}</span>
                  <span className="text-blue-400">: </span>
                  <span>{summary}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveKey(key)}
                  className="px-1.5 py-1 text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                  title="필터 삭제"
                >
                  ✕
                </button>
              </span>
            }
          >
            <div className="w-56 p-2">
              {col.type === "select" ? (
                <div className="flex flex-col gap-1">
                  {col.options?.map((opt) => {
                    const checked = selected.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onSelectChange(
                              key,
                              checked
                                ? selected.filter((v) => v !== opt.value)
                                : [...selected, opt.value],
                            )
                          }
                        />
                        {opt.value}
                      </label>
                    );
                  })}
                </div>
              ) : col.type === "number" ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="number"
                    value={range.min ?? ""}
                    placeholder="최소"
                    onChange={(e) =>
                      onRangeChange(key, {
                        ...range,
                        min: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-400"
                  />
                  <span className="text-gray-400">~</span>
                  <input
                    type="number"
                    value={range.max ?? ""}
                    placeholder="최대"
                    onChange={(e) =>
                      onRangeChange(key, {
                        ...range,
                        max: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              ) : (
                <input
                  autoFocus
                  type="text"
                  value={search}
                  placeholder="포함 검색…"
                  onChange={(e) => onSearchChange(key, e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-400"
                />
              )}
            </div>
          </Popover>
        );
      })}

      {filterKeys.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          필터 초기화
        </button>
      )}
    </div>
  );
}

function Popover({
  open,
  onClose,
  trigger,
  children,
}: {
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      {trigger}
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 rounded-md border border-gray-200 bg-white shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}
