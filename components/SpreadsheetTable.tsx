"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CellValue,
  Column,
  ColumnType,
  Row,
  SortState,
} from "@/lib/types";
import { ROW_HIGHLIGHT } from "@/lib/colors";
import { makeEvaluator, indexToLetters, isFormula } from "@/lib/formula";
import { Tag } from "./Tag";
import { Calendar } from "./Calendar";
import { ColumnHeader } from "./ColumnHeader";

interface Props {
  columns: Column[];
  rows: Row[]; // 필터/정렬이 적용된 표시용 행
  sort: SortState | null;
  onCellChange: (rowId: string, key: string, value: CellValue) => void;
  onToggleSort: (key: string) => void;
  onRenameColumn: (key: string, label: string) => void;
  onChangeColumnType: (key: string, type: ColumnType) => void;
  onInsertColumn: (key: string, side: "left" | "right") => void;
  onDeleteColumn: (key: string) => void;
  onInsertRow: (id: string, where: "above" | "below") => void;
  onMoveRow: (id: string, dir: "up" | "down") => void;
  onDuplicateRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
}

interface Sel {
  r: number;
  c: number;
}

function parseValue(col: Column, raw: string): CellValue {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed.startsWith("=")) return raw; // 수식은 원문 그대로 저장
  if (col.type === "number") {
    const n = Number(trimmed.replace(/,/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  return raw;
}

function displayText(v: CellValue): string {
  return v === null || v === undefined ? "" : String(v);
}

export function SpreadsheetTable(props: Props) {
  const {
    columns,
    rows,
    sort,
    onCellChange,
    onToggleSort,
    onRenameColumn,
    onChangeColumnType,
    onInsertColumn,
    onDeleteColumn,
    onInsertRow,
    onMoveRow,
    onDuplicateRow,
    onDeleteRow,
  } = props;

  const [sel, setSel] = useState<Sel | null>(null);
  const [editing, setEditing] = useState(false);
  const [editInit, setEditInit] = useState("");
  const [editTyped, setEditTyped] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);

  const selRef = useRef(sel);
  selRef.current = sel;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const colsRef = useRef(columns);
  colsRef.current = columns;

  const clamp = useCallback(
    (r: number, c: number): Sel => ({
      r: Math.max(0, Math.min(rowsRef.current.length - 1, r)),
      c: Math.max(0, Math.min(colsRef.current.length - 1, c)),
    }),
    [],
  );

  useEffect(() => {
    if (!editing) containerRef.current?.focus();
  }, [editing, sel]);

  const startEdit = useCallback((initial?: string, typed?: boolean) => {
    const s = selRef.current;
    if (!s) return;
    const col = colsRef.current[s.c];
    if (col.type === "select" || col.type === "date") {
      setEditing(true); // 팝업(드롭다운/달력)
      return;
    }
    const cur = rowsRef.current[s.r]?.[col.key];
    setEditInit(initial !== undefined ? initial : displayText(cur));
    setEditTyped(!!typed);
    setEditing(true);
  }, []);

  const commitText = useCallback(
    (next?: Sel) => {
      const s = selRef.current;
      if (s) {
        const col = colsRef.current[s.c];
        const row = rowsRef.current[s.r];
        if (row && (col.type === "text" || col.type === "number")) {
          onCellChange(row.id, col.key, parseValue(col, inputRef.current?.value ?? ""));
        }
      }
      setEditing(false);
      if (next) setSel(next);
    },
    [onCellChange],
  );

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const s = selRef.current;
      if (!s) return;
      if (e.key === "Enter") {
        e.preventDefault();
        skipBlurRef.current = true;
        commitText(clamp(s.r + 1, s.c));
      } else if (e.key === "Tab") {
        e.preventDefault();
        skipBlurRef.current = true;
        commitText(clamp(s.r, s.c + (e.shiftKey ? -1 : 1)));
      } else if (e.key === "Escape") {
        e.preventDefault();
        skipBlurRef.current = true;
        setEditing(false);
      }
    },
    [commitText, clamp],
  );

  const onInputBlur = useCallback(() => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    commitText();
  }, [commitText]);

  const pickValue = useCallback(
    (rowId: string, key: string, value: string | null) => {
      onCellChange(rowId, key, value === "" ? null : value);
      setEditing(false);
    },
    [onCellChange],
  );

  const closeEdit = useCallback(() => setEditing(false), []);

  const onCellClick = useCallback(
    (r: number, c: number) => {
      const s = selRef.current;
      if (s && s.r === r && s.c === c) {
        startEdit();
      } else {
        setEditing(false);
        setSel({ r, c });
      }
    },
    [startEdit],
  );

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
        const col = columns[sel.c];
        if (col.type === "text" || col.type === "number") {
          e.preventDefault();
          startEdit(key, true);
        }
      }
    },
    [editing, sel, clamp, startEdit, columns, rows, onCellChange],
  );

  const evaluator = useMemo(() => makeEvaluator(columns, rows), [columns, rows]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onGridKeyDown}
      className="max-h-[72vh] overflow-auto rounded-lg border border-gray-200 bg-white outline-none"
    >
      <table className="border-collapse text-sm">
        <thead>
          <tr className="sticky top-0 z-20 bg-gray-50">
            <th
              className="sticky left-0 z-30 border-b border-r border-gray-200 bg-gray-100 px-1 py-2 text-center text-[10px] font-semibold text-gray-400"
              style={{ width: 36, minWidth: 36 }}
            />
            {columns.map((col, c) => (
              <th
                key={col.key}
                style={{ width: col.width, minWidth: col.width }}
                className="border-b border-r border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-600"
              >
                <ColumnHeader
                  column={col}
                  letter={indexToLetters(c)}
                  sort={sort}
                  onToggleSort={onToggleSort}
                  onRename={onRenameColumn}
                  onChangeType={onChangeColumnType}
                  onInsert={onInsertColumn}
                  onDelete={onDeleteColumn}
                />
              </th>
            ))}
            <th
              className="sticky right-0 z-10 border-b border-gray-200 bg-gray-50 px-2 py-2"
              style={{ width: 40, minWidth: 40 }}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <RowView
              key={row.id}
              row={row}
              rowIndex={r}
              columns={columns}
              evaluator={evaluator}
              selCol={sel?.r === r ? sel.c : -1}
              editing={sel?.r === r && editing}
              editInit={sel?.r === r ? editInit : ""}
              editTyped={sel?.r === r ? editTyped : false}
              inputRef={inputRef}
              onCellClick={onCellClick}
              onInputKeyDown={onInputKeyDown}
              onInputBlur={onInputBlur}
              pickValue={pickValue}
              closeEdit={closeEdit}
              onInsertRow={onInsertRow}
              onMoveRow={onMoveRow}
              onDuplicateRow={onDuplicateRow}
              onDeleteRow={onDeleteRow}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 2}
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

type Evaluator = ReturnType<typeof makeEvaluator>;

interface RowProps {
  row: Row;
  rowIndex: number;
  columns: Column[];
  evaluator: Evaluator;
  selCol: number;
  editing: boolean;
  editInit: string;
  editTyped: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onCellClick: (r: number, c: number) => void;
  onInputKeyDown: (e: React.KeyboardEvent) => void;
  onInputBlur: () => void;
  pickValue: (rowId: string, key: string, value: string | null) => void;
  closeEdit: () => void;
  onInsertRow: (id: string, where: "above" | "below") => void;
  onMoveRow: (id: string, dir: "up" | "down") => void;
  onDuplicateRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
}

const RowView = React.memo(function RowView({
  row,
  rowIndex,
  columns,
  evaluator,
  selCol,
  editing,
  editInit,
  editTyped,
  inputRef,
  onCellClick,
  onInputKeyDown,
  onInputBlur,
  pickValue,
  closeEdit,
  onInsertRow,
  onMoveRow,
  onDuplicateRow,
  onDeleteRow,
}: RowProps) {
  const highlight = row.status === "미촬영" ? ROW_HIGHLIGHT : "";
  return (
    <tr className={`group ${highlight} hover:bg-blue-50/40`}>
      <td
        className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-1 text-center text-[10px] text-gray-400 group-hover:bg-blue-50/40"
        style={{ width: 36, minWidth: 36 }}
      >
        {rowIndex + 1}
      </td>
      {columns.map((col, c) => {
        const isSel = c === selCol;
        const isEditing = isSel && editing;
        const value = row[col.key];
        const formula = !isEditing && isFormula(value);
        return (
          <td
            key={col.key}
            onClick={() => onCellClick(rowIndex, c)}
            style={{ width: col.width, minWidth: col.width }}
            className={`relative cursor-default border-b border-r border-gray-100 px-2 py-1.5 align-top ${
              isEditing ? "bg-white ring-2 ring-inset ring-blue-500" : ""
            } ${isSel && !isEditing ? "ring-2 ring-inset ring-blue-500" : ""}`}
          >
            {isEditing && col.type === "select" ? (
              <SelectDropdown
                column={col}
                onPick={(v) => pickValue(row.id, col.key, v)}
                onClose={closeEdit}
              />
            ) : isEditing && col.type === "date" ? (
              <>
                <span className="text-gray-700">{displayText(value)}</span>
                <Calendar
                  value={displayText(value) || null}
                  onPick={(v) => pickValue(row.id, col.key, v)}
                  onClose={closeEdit}
                />
              </>
            ) : isEditing ? (
              <input
                ref={inputRef}
                autoFocus
                defaultValue={editInit}
                inputMode={col.type === "number" ? "numeric" : "text"}
                onFocus={(e) => {
                  if (editTyped) {
                    const len = e.target.value.length;
                    e.target.setSelectionRange(len, len);
                  } else {
                    e.target.select();
                  }
                }}
                onKeyDown={onInputKeyDown}
                onBlur={onInputBlur}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent text-gray-900 caret-blue-600 outline-none"
              />
            ) : formula ? (
              (() => {
                const d = evaluator.display(rowIndex, c);
                return (
                  <span
                    className={`tabular-nums ${d.error ? "text-red-500" : "text-gray-900"}`}
                    title={displayText(value)}
                  >
                    {d.text}
                  </span>
                );
              })()
            ) : col.type === "select" && value ? (
              (() => {
                const opt = col.options?.find((o) => o.value === value);
                return opt ? <Tag option={opt} /> : <span>{displayText(value)}</span>;
              })()
            ) : col.type === "number" ? (
              <span className="tabular-nums">
                {value === null || value === "" || Number.isNaN(Number(value))
                  ? displayText(value)
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
      <td
        className="sticky right-0 z-10 border-b border-gray-100 bg-white px-1 text-center align-middle group-hover:bg-blue-50/40"
        style={{ width: 40, minWidth: 40 }}
      >
        <RowMenu
          onAction={(action) => {
            switch (action) {
              case "above":
                onInsertRow(row.id, "above");
                break;
              case "below":
                onInsertRow(row.id, "below");
                break;
              case "up":
                onMoveRow(row.id, "up");
                break;
              case "down":
                onMoveRow(row.id, "down");
                break;
              case "duplicate":
                onDuplicateRow(row.id);
                break;
              case "delete":
                onDeleteRow(row.id);
                break;
            }
          }}
        />
      </td>
    </tr>
  );
});

type RowAction = "above" | "below" | "up" | "down" | "duplicate" | "delete";

function RowMenu({ onAction }: { onAction: (a: RowAction) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const item = (a: RowAction, label: string, danger?: boolean) => (
    <button
      type="button"
      onClick={() => {
        onAction(a);
        setOpen(false);
      }}
      className={`w-full rounded px-2 py-1 text-left text-sm hover:bg-gray-50 ${
        danger ? "text-red-600" : ""
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded px-1 text-gray-300 opacity-0 hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
        title="행 메뉴"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-30 w-36 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
          {item("above", "위에 행 삽입")}
          {item("below", "아래에 행 삽입")}
          {item("duplicate", "행 복제")}
          {item("up", "위로 이동")}
          {item("down", "아래로 이동")}
          <div className="my-1 border-t border-gray-100" />
          {item("delete", "행 삭제", true)}
        </div>
      )}
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
      onClick={(e) => e.stopPropagation()}
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
