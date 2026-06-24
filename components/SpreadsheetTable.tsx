"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CellValue,
  Column,
  ColumnType,
  Row,
  SelectOption,
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
  rowHeights?: Record<string, number>;
  sort: SortState | null;
  onCellChange: (rowId: string, key: string, value: CellValue) => void;
  onBulkChange: (
    updates: { rowId: string; key: string; value: CellValue }[],
  ) => void;
  onToggleSort: (key: string) => void;
  onRenameColumn: (key: string, label: string) => void;
  onChangeColumnType: (key: string, type: ColumnType) => void;
  onSetColumnOptions: (key: string, options: SelectOption[]) => void;
  onResizeColumn: (key: string, width: number) => void;
  onResizeRow: (rowId: string, height: number) => void;
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
    rowHeights,
    sort,
    onCellChange,
    onBulkChange,
    onToggleSort,
    onRenameColumn,
    onChangeColumnType,
    onSetColumnOptions,
    onResizeColumn,
    onResizeRow,
    onInsertColumn,
    onDeleteColumn,
    onInsertRow,
    onMoveRow,
    onDuplicateRow,
    onDeleteRow,
  } = props;

  const [sel, setSel] = useState<Sel | null>(null); // 활성(포커스) 셀
  const [anchor, setAnchor] = useState<Sel | null>(null); // 범위 선택 기준점
  const [pointRange, setPointRange] = useState<{ a: Sel; f: Sel } | null>(null); // 수식 참조 마퀴
  const [editing, setEditing] = useState(false);
  const [editInit, setEditInit] = useState("");
  const [editTyped, setEditTyped] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);
  const rangeDragRef = useRef(false);

  const selRef = useRef(sel);
  selRef.current = sel;
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const colsRef = useRef(columns);
  colsRef.current = columns;

  // 선택 범위 경계 (anchor ~ sel 사각형)
  let minR = -1,
    maxR = -1,
    minC = -1,
    maxC = -1;
  if (sel) {
    const a = anchor ?? sel;
    minR = Math.min(a.r, sel.r);
    maxR = Math.max(a.r, sel.r);
    minC = Math.min(a.c, sel.c);
    maxC = Math.max(a.c, sel.c);
  }
  const boundsRef = useRef({ minR, maxR, minC, maxC });
  boundsRef.current = { minR, maxR, minC, maxC };

  // 수식 참조 마퀴 경계
  let pMinR = -1,
    pMaxR = -1,
    pMinC = -1,
    pMaxC = -1;
  if (pointRange) {
    pMinR = Math.min(pointRange.a.r, pointRange.f.r);
    pMaxR = Math.max(pointRange.a.r, pointRange.f.r);
    pMinC = Math.min(pointRange.a.c, pointRange.f.c);
    pMaxC = Math.max(pointRange.a.c, pointRange.f.c);
  }

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

  const editAt = useCallback(
    (r: number, c: number, initial?: string, typed?: boolean) => {
      const col = colsRef.current[c];
      if (!col) return;
      setSel({ r, c });
      setAnchor({ r, c });
      if (col.type === "select" || col.type === "date") {
        setEditing(true); // 팝업(드롭다운/달력)
        return;
      }
      const cur = rowsRef.current[r]?.[col.key];
      setEditInit(initial !== undefined ? initial : displayText(cur));
      setEditTyped(!!typed);
      setEditing(true);
    },
    [],
  );

  const startEdit = useCallback(
    (initial?: string, typed?: boolean) => {
      const s = selRef.current;
      if (!s) return;
      editAt(s.r, s.c, initial, typed);
    },
    [editAt],
  );

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

  const onCellDblClick = useCallback(
    (r: number, c: number) => {
      if (inputRef.current?.value.trimStart().startsWith("=")) return;
      editAt(r, c);
    },
    [editAt],
  );

  const move = useCallback(
    (nr: number, nc: number, extend: boolean) => {
      const next = clamp(nr, nc);
      setSel(next);
      if (extend) {
        setAnchor((a) => a ?? selRef.current);
      } else {
        setAnchor(next);
      }
    },
    [clamp],
  );

  const onGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editing || !sel) return;
      const { key } = e;
      const meta = e.metaKey || e.ctrlKey;

      if (meta && key.toLowerCase() === "c") {
        e.preventDefault();
        const b = boundsRef.current;
        const lines: string[] = [];
        for (let r = b.minR; r <= b.maxR; r++) {
          const cells: string[] = [];
          for (let c = b.minC; c <= b.maxC; c++) {
            cells.push(displayText(rowsRef.current[r]?.[colsRef.current[c].key]));
          }
          lines.push(cells.join("\t"));
        }
        navigator.clipboard?.writeText(lines.join("\n"));
        return;
      }
      if (meta && key.toLowerCase() === "v") {
        e.preventDefault();
        const b = boundsRef.current;
        navigator.clipboard?.readText().then((text) => {
          const grid = text.replace(/\r/g, "").split("\n").map((l) => l.split("\t"));
          if (
            grid.length > 1 &&
            grid[grid.length - 1].length === 1 &&
            grid[grid.length - 1][0] === ""
          )
            grid.pop();
          const updates: { rowId: string; key: string; value: CellValue }[] = [];
          const rs = rowsRef.current;
          const cs = colsRef.current;
          for (let i = 0; i < grid.length; i++) {
            const rr = b.minR + i;
            if (rr >= rs.length) break;
            for (let j = 0; j < grid[i].length; j++) {
              const cc = b.minC + j;
              if (cc >= cs.length) break;
              updates.push({
                rowId: rs[rr].id,
                key: cs[cc].key,
                value: parseValue(cs[cc], grid[i][j]),
              });
            }
          }
          onBulkChange(updates);
        });
        return;
      }

      if (key === "ArrowUp") {
        e.preventDefault();
        move(sel.r - 1, sel.c, e.shiftKey);
      } else if (key === "ArrowDown") {
        e.preventDefault();
        move(sel.r + 1, sel.c, e.shiftKey);
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        move(sel.r, sel.c - 1, e.shiftKey);
      } else if (key === "ArrowRight") {
        e.preventDefault();
        move(sel.r, sel.c + 1, e.shiftKey);
      } else if (key === "Tab") {
        e.preventDefault();
        move(sel.r, sel.c + (e.shiftKey ? -1 : 1), false);
      } else if (key === "Enter") {
        e.preventDefault();
        startEdit();
      } else if (key === "Backspace" || key === "Delete") {
        e.preventDefault();
        const b = boundsRef.current;
        const updates: { rowId: string; key: string; value: CellValue }[] = [];
        for (let r = b.minR; r <= b.maxR; r++) {
          for (let c = b.minC; c <= b.maxC; c++) {
            const row = rowsRef.current[r];
            if (row) updates.push({ rowId: row.id, key: colsRef.current[c].key, value: null });
          }
        }
        onBulkChange(updates);
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const col = columns[sel.c];
        if (col.type === "text" || col.type === "number") {
          e.preventDefault();
          startEdit(key, true);
        }
      }
    },
    [editing, sel, move, startEdit, columns, onBulkChange],
  );

  const evaluator = useMemo(() => makeEvaluator(columns, rows), [columns, rows]);

  // ----- 수식 입력 중 셀 클릭/드래그로 참조 삽입 -----
  const draggingPointRef = useRef(false);
  const pointAnchorRef = useRef<{ r: number; c: number } | null>(null);
  const pointStartIdxRef = useRef(0);
  const pointLastLenRef = useRef(0);

  const isFormulaInput = useCallback(
    () =>
      !!inputRef.current &&
      inputRef.current.value.trimStart().startsWith("="),
    [],
  );

  const onCellMouseDown = useCallback(
    (r: number, c: number, e: React.MouseEvent) => {
      // 1) 수식 편집 중 → 참조 삽입 모드
      if (isFormulaInput()) {
        e.preventDefault(); // 입력 포커스 유지 (blur 방지)
        const inp = inputRef.current!;
        draggingPointRef.current = true;
        pointAnchorRef.current = { r, c };
        const pos = inp.selectionStart ?? inp.value.length;
        pointStartIdxRef.current = pos;
        const ref = indexToLetters(c) + (r + 1);
        inp.value = inp.value.slice(0, pos) + ref + inp.value.slice(pos);
        const caret = pos + ref.length;
        inp.setSelectionRange(caret, caret);
        pointLastLenRef.current = ref.length;
        setPointRange({ a: { r, c }, f: { r, c } });
        return;
      }
      // 2) 일반 범위 선택 드래그
      setEditing(false);
      if (e.shiftKey && selRef.current) {
        setAnchor((a) => a ?? selRef.current);
        setSel({ r, c });
      } else {
        setAnchor({ r, c });
        setSel({ r, c });
        rangeDragRef.current = true;
      }
    },
    [isFormulaInput],
  );

  const onCellMouseEnter = useCallback((r: number, c: number) => {
    // 수식 참조 드래그
    if (draggingPointRef.current) {
      const a = pointAnchorRef.current;
      const inp = inputRef.current;
      if (!a || !inp) return;
      const refStr =
        a.r === r && a.c === c
          ? indexToLetters(c) + (r + 1)
          : `${indexToLetters(a.c)}${a.r + 1}:${indexToLetters(c)}${r + 1}`;
      const start = pointStartIdxRef.current;
      inp.value =
        inp.value.slice(0, start) +
        refStr +
        inp.value.slice(start + pointLastLenRef.current);
      const caret = start + refStr.length;
      inp.setSelectionRange(caret, caret);
      pointLastLenRef.current = refStr.length;
      if (a) setPointRange({ a, f: { r, c } });
      return;
    }
    // 일반 범위 선택 드래그
    if (rangeDragRef.current) setSel({ r, c });
  }, []);

  // 편집이 끝나면 수식 참조 마퀴 제거
  useEffect(() => {
    if (!editing) setPointRange(null);
  }, [editing]);

  useEffect(() => {
    const up = () => {
      draggingPointRef.current = false;
      rangeDragRef.current = false;
    };
    document.addEventListener("mouseup", up);
    return () => document.removeEventListener("mouseup", up);
  }, []);

  // ----- 확대/축소 -----
  const [zoom, setZoom] = useState(1);
  const clampZoom = (z: number) => Math.min(2, Math.max(0.5, +z.toFixed(2)));
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 데스크탑: Ctrl/⌘ + 스크롤
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z - e.deltaY * 0.0015));
    };

    // 모바일: 두 손가락 핀치
    let pinchStartDist = 0;
    let pinchStartZoom = 1;
    const dist = (t: TouchList) =>
      Math.hypot(
        t[0].clientX - t[1].clientX,
        t[0].clientY - t[1].clientY,
      );
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist = dist(e.touches);
        pinchStartZoom = zoomRef.current;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault(); // 브라우저 전체 확대 방지, 표만 확대
        const ratio = dist(e.touches) / pinchStartDist;
        setZoom(() => clampZoom(pinchStartZoom * ratio));
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDist = 0;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <div>
      <div className="mb-1 flex items-center justify-end gap-1 text-xs text-gray-500">
        <span className="mr-1">확대</span>
        <button
          type="button"
          onClick={() => setZoom((z) => clampZoom(z - 0.1))}
          className="h-6 w-6 rounded border border-gray-300 hover:bg-gray-50"
          title="축소"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="w-12 rounded border border-gray-300 py-0.5 tabular-nums hover:bg-gray-50"
          title="100%로"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => clampZoom(z + 0.1))}
          className="h-6 w-6 rounded border border-gray-300 hover:bg-gray-50"
          title="확대"
        >
          +
        </button>
      </div>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onGridKeyDown}
        className="max-h-[72vh] overflow-auto rounded-2xl border border-pink-100 bg-white shadow-sm shadow-pink-50 outline-none"
      >
        <table className="border-collapse text-sm" style={{ zoom }}>
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
                className="relative border-b border-r border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-600"
              >
                <ColumnHeader
                  column={col}
                  letter={indexToLetters(c)}
                  sort={sort}
                  onToggleSort={onToggleSort}
                  onRename={onRenameColumn}
                  onChangeType={onChangeColumnType}
                  onSetOptions={onSetColumnOptions}
                  onInsert={onInsertColumn}
                  onDelete={onDeleteColumn}
                />
                <ColumnResizer
                  width={col.width}
                  onResize={(w) => onResizeColumn(col.key, w)}
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
              rowHeight={rowHeights?.[row.id]}
              onResizeRow={onResizeRow}
              columns={columns}
              evaluator={evaluator}
              selCol={sel?.r === r ? sel.c : -1}
              rangeMinC={r >= minR && r <= maxR ? minC : -1}
              rangeMaxC={r >= minR && r <= maxR ? maxC : -1}
              pointMinC={r >= pMinR && r <= pMaxR ? pMinC : -1}
              pointMaxC={r >= pMinR && r <= pMaxR ? pMaxC : -1}
              editing={sel?.r === r && editing}
              editInit={sel?.r === r ? editInit : ""}
              editTyped={sel?.r === r ? editTyped : false}
              inputRef={inputRef}
              onCellDblClick={onCellDblClick}
              onCellMouseDown={onCellMouseDown}
              onCellMouseEnter={onCellMouseEnter}
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
    </div>
  );
}

type Evaluator = ReturnType<typeof makeEvaluator>;

interface RowProps {
  row: Row;
  rowIndex: number;
  rowHeight?: number;
  onResizeRow: (rowId: string, height: number) => void;
  columns: Column[];
  evaluator: Evaluator;
  selCol: number;
  rangeMinC: number;
  rangeMaxC: number;
  pointMinC: number;
  pointMaxC: number;
  editing: boolean;
  editInit: string;
  editTyped: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onCellDblClick: (r: number, c: number) => void;
  onCellMouseDown: (r: number, c: number, e: React.MouseEvent) => void;
  onCellMouseEnter: (r: number, c: number) => void;
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
  rowHeight,
  onResizeRow,
  columns,
  evaluator,
  selCol,
  rangeMinC,
  rangeMaxC,
  pointMinC,
  pointMaxC,
  editing,
  editInit,
  editTyped,
  inputRef,
  onCellDblClick,
  onCellMouseDown,
  onCellMouseEnter,
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
        className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-1 text-center align-top text-[10px] text-gray-400 group-hover:bg-blue-50/40"
        style={{ width: 36, minWidth: 36, height: rowHeight }}
      >
        <span className="leading-6">{rowIndex + 1}</span>
        <RowResizer
          height={rowHeight ?? 33}
          onResize={(h) => onResizeRow(row.id, h)}
        />
      </td>
      {columns.map((col, c) => {
        const isSel = c === selCol;
        const isEditing = isSel && editing;
        const inRange = c >= rangeMinC && c <= rangeMaxC;
        const inPoint = c >= pointMinC && c <= pointMaxC;
        const value = row[col.key];
        const formula = !isEditing && isFormula(value);
        return (
          <td
            key={col.key}
            onDoubleClick={() => onCellDblClick(rowIndex, c)}
            onMouseDown={(e) => onCellMouseDown(rowIndex, c, e)}
            onMouseEnter={() => onCellMouseEnter(rowIndex, c)}
            style={{ width: col.width, minWidth: col.width }}
            className={`relative cursor-cell select-none border-b border-r border-gray-100 px-2 py-1.5 align-top ${
              inPoint
                ? "bg-blue-100/60 outline-dashed outline-2 -outline-offset-2 outline-blue-500"
                : isEditing
                  ? "bg-white ring-2 ring-inset ring-blue-500"
                  : isSel
                    ? "bg-white ring-2 ring-inset ring-blue-500"
                    : inRange
                      ? "bg-blue-100/70"
                      : ""
            }`}
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
                onMouseDown={(e) => e.stopPropagation()}
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

function ColumnResizer({
  width,
  onResize,
}: {
  width: number;
  onResize: (w: number) => void;
}) {
  const start = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = width;
    const move = (ev: MouseEvent) =>
      onResize(Math.max(50, startW + ev.clientX - startX));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  return (
    <div
      onMouseDown={start}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-blue-400/60"
      title="드래그하여 너비 조절"
    />
  );
}

function RowResizer({
  height,
  onResize,
}: {
  height: number;
  onResize: (h: number) => void;
}) {
  const start = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = height;
    const move = (ev: MouseEvent) =>
      onResize(Math.max(24, startH + ev.clientY - startY));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  return (
    <div
      onMouseDown={start}
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-0 left-0 z-10 h-1.5 w-full cursor-row-resize hover:bg-blue-400/60"
      title="드래그하여 행 높이 조절"
    />
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
      onMouseDown={(e) => e.stopPropagation()}
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
