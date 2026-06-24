"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  CellValue,
  Column,
  FilterState,
  Row,
  SortState,
} from "@/lib/types";
import { ROW_HIGHLIGHT } from "@/lib/colors";
import { Tag } from "./Tag";
import { ColumnHeader } from "./ColumnHeader";

interface Props {
  columns: Column[];
  rows: Row[]; // 이미 필터/정렬이 적용된 표시용 행
  filter: FilterState;
  sort: SortState | null;
  onCellChange: (rowId: string, key: string, value: CellValue) => void;
  onDeleteRow: (rowId: string) => void;
  onToggleSort: (key: string) => void;
  onSelectFilter: (key: string, values: string[]) => void;
  onSearchFilter: (key: string, term: string) => void;
}

interface Sel {
  r: number;
  c: number;
}

function parseValue(col: Column, raw: string): CellValue {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (col.type === "number") {
    const n = Number(trimmed.replace(/,/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  return raw;
}

function displayText(v: CellValue): string {
  return v === null || v === undefined ? "" : String(v);
}

export function SpreadsheetTable({
  columns,
  rows,
  filter,
  sort,
  onCellChange,
  onDeleteRow,
  onToggleSort,
  onSelectFilter,
  onSearchFilter,
}: Props) {
  const [sel, setSel] = useState<Sel | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const nRows = rows.length;
  const nCols = columns.length;

  const clamp = useCallback(
    (r: number, c: number): Sel => ({
      r: Math.max(0, Math.min(nRows - 1, r)),
      c: Math.max(0, Math.min(nCols - 1, c)),
    }),
    [nRows, nCols],
  );

  // 편집 모드 진입/종료 시 포커스 이동
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      containerRef.current?.focus();
    }
  }, [editing, sel]);

  const startEdit = useCallback(
    (initial?: string) => {
      if (!sel) return;
      const col = columns[sel.c];
      if (col.type === "select") {
        setEditing(true); // 드롭다운 표시
        return;
      }
      const cur = rows[sel.r]?.[col.key];
      setDraft(initial !== undefined ? initial : displayText(cur));
      setEditing(true);
    },
    [sel, columns, rows],
  );

  const commit = useCallback(
    (next?: Sel) => {
      if (sel) {
        const col = columns[sel.c];
        const row = rows[sel.r];
        if (row && col.type !== "select") {
          onCellChange(row.id, col.key, parseValue(col, draft));
        }
      }
      setEditing(false);
      setDraft("");
      if (next) setSel(next);
    },
    [sel, columns, rows, draft, onCellChange],
  );

  const setSelectValue = useCallback(
    (value: string | null) => {
      if (!sel) return;
      const col = columns[sel.c];
      const row = rows[sel.r];
      if (row) onCellChange(row.id, col.key, value);
      setEditing(false);
    },
    [sel, columns, rows, onCellChange],
  );

  // 셀 미편집 상태에서의 키보드 내비게이션
  const onGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editing || !sel) return;
      const { key } = e;
      if (key === "ArrowUp") {
        e.preventDefault();
        setSel(clamp(sel.r - 1, sel.c));
      } else if (key === "ArrowDown") {
        e.preventDefault();
        setSel(clamp(sel.r + 1, sel.c));
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        setSel(clamp(sel.r, sel.c - 1));
      } else if (key === "ArrowRight") {
        e.preventDefault();
        setSel(clamp(sel.r, sel.c + 1));
      } else if (key === "Tab") {
        e.preventDefault();
        setSel(clamp(sel.r, sel.c + (e.shiftKey ? -1 : 1)));
      } else if (key === "Enter") {
        e.preventDefault();
        startEdit();
      } else if (key === "Backspace" || key === "Delete") {
        e.preventDefault();
        const col = columns[sel.c];
        const row = rows[sel.r];
        if (row) onCellChange(row.id, col.key, null);
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // 입력 시작 → 편집 모드 (select 제외)
        const col = columns[sel.c];
        if (col.type !== "select") {
          e.preventDefault();
          startEdit(key);
        }
      }
    },
    [editing, sel, clamp, startEdit, columns, rows, onCellChange],
  );

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!sel) return;
      if (e.key === "Enter") {
        e.preventDefault();
        commit(clamp(sel.r + 1, sel.c));
      } else if (e.key === "Tab") {
        e.preventDefault();
        commit(clamp(sel.r, sel.c + (e.shiftKey ? -1 : 1)));
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditing(false);
        setDraft("");
      }
    },
    [sel, commit, clamp],
  );

  const onCellClick = useCallback(
    (r: number, c: number) => {
      if (sel && sel.r === r && sel.c === c && !editing) {
        startEdit();
      } else {
        if (editing) commit();
        setSel({ r, c });
      }
    },
    [sel, editing, startEdit, commit],
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onGridKeyDown}
      className="overflow-x-auto rounded-lg border border-gray-200 bg-white outline-none"
    >
      <table className="border-collapse text-sm" style={{ minWidth: "100%" }}>
        <thead>
          <tr className="sticky top-0 z-10 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width, minWidth: col.width }}
                className="border-b border-r border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-600"
              >
                <ColumnHeader
                  column={col}
                  filter={filter}
                  sort={sort}
                  onToggleSort={onToggleSort}
                  onSelectChange={onSelectFilter}
                  onSearchChange={onSearchFilter}
                />
              </th>
            ))}
            <th className="border-b border-gray-200 px-2 py-2" style={{ width: 44 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => {
            const highlight = row.status === "미촬영" ? ROW_HIGHLIGHT : "";
            return (
              <tr key={row.id} className={`group ${highlight} hover:bg-blue-50/40`}>
                {columns.map((col, c) => {
                  const isSel = sel?.r === r && sel?.c === c;
                  const isEditing = isSel && editing;
                  const value = row[col.key];
                  return (
                    <td
                      key={col.key}
                      onClick={() => onCellClick(r, c)}
                      style={{ width: col.width, minWidth: col.width }}
                      className={`relative cursor-default border-b border-r border-gray-100 px-2 py-1.5 align-top ${
                        isSel ? "ring-2 ring-inset ring-blue-500" : ""
                      }`}
                    >
                      {isEditing && col.type === "select" ? (
                        <SelectDropdown
                          column={col}
                          onPick={setSelectValue}
                          onClose={() => setEditing(false)}
                        />
                      ) : isEditing ? (
                        <input
                          ref={inputRef}
                          value={draft}
                          inputMode={col.type === "number" ? "numeric" : "text"}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={onInputKeyDown}
                          onBlur={() => commit()}
                          className="w-full bg-transparent outline-none"
                        />
                      ) : col.type === "select" && value ? (
                        (() => {
                          const opt = col.options?.find((o) => o.value === value);
                          return opt ? (
                            <Tag option={opt} />
                          ) : (
                            <span>{displayText(value)}</span>
                          );
                        })()
                      ) : col.type === "number" ? (
                        <span className="tabular-nums">
                          {value === null || value === ""
                            ? ""
                            : Number(value).toLocaleString("ko-KR")}
                        </span>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">
                          {displayText(value)}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-gray-100 px-1 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => onDeleteRow(row.id)}
                    className="rounded px-1 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    title="행 삭제"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-4 py-8 text-center text-sm text-gray-400"
              >
                표시할 데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SelectDropdown({
  column,
  onPick,
  onClose,
}: {
  column: Column;
  onPick: (v: string | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1 w-40 rounded-md border border-gray-200 bg-white p-1 shadow-lg"
    >
      {column.options?.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onPick(opt.value)}
          className="flex w-full items-center rounded px-1.5 py-1 text-left hover:bg-gray-50"
        >
          <Tag option={opt} />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPick(null)}
        className="mt-0.5 w-full rounded px-1.5 py-1 text-left text-xs text-gray-400 hover:bg-gray-50"
      >
        비우기
      </button>
    </div>
  );
}
