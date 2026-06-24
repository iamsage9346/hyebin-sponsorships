"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CellValue,
  Column,
  ColumnType,
  FilterState,
  Row,
  SelectOption,
  Sheet,
  SortState,
  Workspace,
} from "@/lib/types";
import { TAG_COLORS } from "@/lib/colors";
import {
  loadWorkspace,
  saveWorkspace,
  createBlankSheet,
  emptyRow,
  newColumnKey,
  newRowId,
} from "@/lib/storage";
import {
  applyFilter,
  applySort,
  computeSummary,
  emptyFilter,
  formatWon,
  hasActiveFilter,
} from "@/lib/sheet";
import { SpreadsheetTable } from "@/components/SpreadsheetTable";
import { FilterBar } from "@/components/FilterBar";
import { CalendarView } from "@/components/CalendarView";
import { SheetTabs } from "@/components/SheetTabs";

export default function Page() {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [filter, setFilter] = useState<FilterState>(emptyFilter());
  const [filterKeys, setFilterKeys] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);

  useEffect(() => {
    setWs(loadWorkspace());
  }, []);

  useEffect(() => {
    if (ws) saveWorkspace(ws);
  }, [ws]);

  const activeId = ws?.activeId ?? "";

  // 시트 전환 시 필터/정렬 초기화
  useEffect(() => {
    setFilter(emptyFilter());
    setFilterKeys([]);
    setSort(null);
  }, [activeId]);

  const activeSheet = useMemo(
    () => ws?.sheets.find((s) => s.id === ws.activeId) ?? null,
    [ws],
  );
  const columns = useMemo(() => activeSheet?.columns ?? [], [activeSheet]);
  const rows = useMemo(() => activeSheet?.rows ?? [], [activeSheet]);

  const displayRows = useMemo(() => {
    const filtered = applyFilter(rows, columns, filter);
    return applySort(filtered, columns, sort);
  }, [rows, columns, filter, sort]);

  const summary = useMemo(
    () => computeSummary(rows, displayRows),
    [rows, displayRows],
  );

  const updateSheet = useCallback((updater: (s: Sheet) => Sheet) => {
    setWs((w) =>
      w
        ? {
            ...w,
            sheets: w.sheets.map((s) => (s.id === w.activeId ? updater(s) : s)),
          }
        : w,
    );
  }, []);

  // ----- 셀 -----
  const onCellChange = useCallback(
    (rowId: string, key: string, value: CellValue) => {
      updateSheet((s) => ({
        ...s,
        rows: s.rows.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)),
      }));
    },
    [updateSheet],
  );

  const onBulkChange = useCallback(
    (updates: { rowId: string; key: string; value: CellValue }[]) => {
      if (updates.length === 0) return;
      const byRow = new Map<string, Record<string, CellValue>>();
      for (const u of updates) {
        const m = byRow.get(u.rowId) ?? {};
        m[u.key] = u.value;
        byRow.set(u.rowId, m);
      }
      updateSheet((s) => ({
        ...s,
        rows: s.rows.map((r) =>
          byRow.has(r.id) ? { ...r, ...byRow.get(r.id) } : r,
        ),
      }));
    },
    [updateSheet],
  );

  // ----- 행 -----
  const onAddRow = useCallback(() => {
    updateSheet((s) => ({ ...s, rows: [...s.rows, emptyRow(s.columns)] }));
  }, [updateSheet]);

  const onDeleteRow = useCallback(
    (id: string) => {
      updateSheet((s) => ({ ...s, rows: s.rows.filter((r) => r.id !== id) }));
    },
    [updateSheet],
  );

  const onInsertRow = useCallback(
    (id: string, where: "above" | "below") => {
      updateSheet((s) => {
        const idx = s.rows.findIndex((r) => r.id === id);
        if (idx < 0) return s;
        const at = where === "above" ? idx : idx + 1;
        const rows = [...s.rows];
        rows.splice(at, 0, emptyRow(s.columns));
        return { ...s, rows };
      });
    },
    [updateSheet],
  );

  const onMoveRow = useCallback(
    (id: string, dir: "up" | "down") => {
      updateSheet((s) => {
        const idx = s.rows.findIndex((r) => r.id === id);
        if (idx < 0) return s;
        const target = dir === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= s.rows.length) return s;
        const rows = [...s.rows];
        [rows[idx], rows[target]] = [rows[target], rows[idx]];
        return { ...s, rows };
      });
    },
    [updateSheet],
  );

  const onDuplicateRow = useCallback(
    (id: string) => {
      updateSheet((s) => {
        const idx = s.rows.findIndex((r) => r.id === id);
        if (idx < 0) return s;
        const copy: Row = { ...s.rows[idx], id: newRowId() };
        const rows = [...s.rows];
        rows.splice(idx + 1, 0, copy);
        return { ...s, rows };
      });
    },
    [updateSheet],
  );

  // ----- 컬럼 -----
  const onRenameColumn = useCallback(
    (key: string, label: string) => {
      updateSheet((s) => ({
        ...s,
        columns: s.columns.map((c) => (c.key === key ? { ...c, label } : c)),
      }));
    },
    [updateSheet],
  );

  const onChangeColumnType = useCallback(
    (key: string, type: ColumnType) => {
      updateSheet((s) => {
        const columns = s.columns.map((c) => {
          if (c.key !== key) return c;
          if (type === "select" && (!c.options || c.options.length === 0)) {
            const seen: string[] = [];
            for (const row of s.rows) {
              const v = row[key];
              if (typeof v === "string" && v.trim() !== "" && !seen.includes(v)) {
                seen.push(v);
              }
            }
            const options: SelectOption[] = seen.map((value, i) => ({
              value,
              color: TAG_COLORS[i % TAG_COLORS.length],
            }));
            return { ...c, type, options };
          }
          return { ...c, type };
        });
        return { ...s, columns };
      });
    },
    [updateSheet],
  );

  const onSetColumnOptions = useCallback(
    (key: string, options: SelectOption[]) => {
      updateSheet((s) => ({
        ...s,
        columns: s.columns.map((c) => (c.key === key ? { ...c, options } : c)),
      }));
    },
    [updateSheet],
  );

  const onResizeColumn = useCallback(
    (key: string, width: number) => {
      updateSheet((s) => ({
        ...s,
        columns: s.columns.map((c) => (c.key === key ? { ...c, width } : c)),
      }));
    },
    [updateSheet],
  );

  const onResizeRow = useCallback(
    (rowId: string, height: number) => {
      updateSheet((s) => ({
        ...s,
        rowHeights: { ...(s.rowHeights ?? {}), [rowId]: height },
      }));
    },
    [updateSheet],
  );

  const onInsertColumn = useCallback(
    (key: string, side: "left" | "right") => {
      updateSheet((s) => {
        const idx = s.columns.findIndex((c) => c.key === key);
        if (idx < 0) return s;
        const at = side === "left" ? idx : idx + 1;
        const col: Column = {
          key: newColumnKey(),
          label: "새 컬럼",
          type: "text",
          width: 120,
        };
        const columns = [...s.columns];
        columns.splice(at, 0, col);
        const rows = s.rows.map((r) => ({ ...r, [col.key]: null }));
        return { ...s, columns, rows };
      });
    },
    [updateSheet],
  );

  const onDeleteColumn = useCallback(
    (key: string) => {
      updateSheet((s) => ({
        ...s,
        columns: s.columns.filter((c) => c.key !== key),
      }));
      removeFilterFor(key);
    },
    [updateSheet],
  );

  // ----- 시트 -----
  const onSelectSheet = useCallback((id: string) => {
    setWs((w) => (w ? { ...w, activeId: id } : w));
  }, []);

  const onAddSheet = useCallback(() => {
    setWs((w) => {
      if (!w) return w;
      const sheet = createBlankSheet(`시트 ${w.sheets.length + 1}`);
      return { sheets: [...w.sheets, sheet], activeId: sheet.id };
    });
  }, []);

  const onRenameSheet = useCallback((id: string, name: string) => {
    setWs((w) =>
      w
        ? { ...w, sheets: w.sheets.map((s) => (s.id === id ? { ...s, name } : s)) }
        : w,
    );
  }, []);

  const onDeleteSheet = useCallback((id: string) => {
    setWs((w) => {
      if (!w || w.sheets.length <= 1) return w;
      const sheets = w.sheets.filter((s) => s.id !== id);
      const activeId = w.activeId === id ? sheets[0].id : w.activeId;
      return { sheets, activeId };
    });
  }, []);

  // ----- 정렬 -----
  const onToggleSort = useCallback((key: string) => {
    setSort((s) => {
      if (s?.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  // ----- 필터 -----
  const removeFilterFor = (key: string) => {
    setFilterKeys((keys) => keys.filter((k) => k !== key));
    setFilter((f) => {
      const selected = { ...f.selected };
      const search = { ...f.search };
      const range = { ...f.range };
      delete selected[key];
      delete search[key];
      delete range[key];
      return { selected, search, range };
    });
  };

  const onAddFilterKey = useCallback((key: string) => {
    setFilterKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
  }, []);

  const onRemoveFilterKey = useCallback((key: string) => {
    removeFilterFor(key);
  }, []);

  const onSelectFilter = useCallback((key: string, values: string[]) => {
    setFilter((f) => ({ ...f, selected: { ...f.selected, [key]: values } }));
  }, []);

  const onSearchFilter = useCallback((key: string, term: string) => {
    setFilter((f) => ({ ...f, search: { ...f.search, [key]: term } }));
  }, []);

  const onRangeFilter = useCallback(
    (key: string, range: { min: number | null; max: number | null }) => {
      setFilter((f) => ({ ...f, range: { ...f.range, [key]: range } }));
    },
    [],
  );

  const onClearFilters = useCallback(() => {
    setFilter(emptyFilter());
    setFilterKeys([]);
  }, []);

  if (!ws || !activeSheet) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-400">
        불러오는 중…
      </main>
    );
  }

  const filterActive = hasActiveFilter(filter);

  return (
    <main className="mx-auto max-w-[1500px] px-3 py-5 sm:px-4 sm:py-6">
      <header className="mb-3">
        <h1 className="text-xl font-bold sm:text-2xl">광고 협찬 관리</h1>
        <p className="mt-1 hidden text-xs text-gray-400 sm:block">
          수식: <code className="rounded bg-gray-100 px-1">=D*0.033</code> (같은 행
          D열) · <code className="rounded bg-gray-100 px-1">=D2*0.033</code> · 수식
          입력 중 다른 셀을 클릭·드래그하면 참조가 들어갑니다.
        </p>
      </header>

      <div className="mb-4">
        <SheetTabs
          sheets={ws.sheets}
          activeId={ws.activeId}
          onSelect={onSelectSheet}
          onAdd={onAddSheet}
          onRename={onRenameSheet}
          onDelete={onDeleteSheet}
        />
      </div>

      <CalendarView columns={columns} rows={rows} />

      <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <SummaryCard label="광고비 총합" value={`₩ ${formatWon(summary.feeTotal)}`} />
        <SummaryCard
          label="입금완료 합계"
          value={`₩ ${formatWon(summary.paidTotal)}`}
          accent="green"
        />
        <SummaryCard
          label="미입금 합계"
          value={`₩ ${formatWon(summary.unpaidTotal)}`}
          accent="red"
        />
        <SummaryCard
          label="건수"
          value={
            filterActive
              ? `${summary.shown} / ${summary.total}`
              : `${summary.total}`
          }
        />
      </section>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <FilterBar
          columns={columns}
          filterKeys={filterKeys}
          filter={filter}
          onAddKey={onAddFilterKey}
          onRemoveKey={onRemoveFilterKey}
          onSelectChange={onSelectFilter}
          onSearchChange={onSearchFilter}
          onRangeChange={onRangeFilter}
          onClearAll={onClearFilters}
        />
        <div className="ml-auto flex items-center gap-2">
          {sort && (
            <button
              type="button"
              onClick={() => setSort(null)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              정렬 해제
            </button>
          )}
          <button
            type="button"
            onClick={onAddRow}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 행 추가
          </button>
        </div>
      </div>

      <SpreadsheetTable
        columns={columns}
        rows={displayRows}
        rowHeights={activeSheet.rowHeights}
        sort={sort}
        onCellChange={onCellChange}
        onBulkChange={onBulkChange}
        onToggleSort={onToggleSort}
        onRenameColumn={onRenameColumn}
        onChangeColumnType={onChangeColumnType}
        onSetColumnOptions={onSetColumnOptions}
        onResizeColumn={onResizeColumn}
        onResizeRow={onResizeRow}
        onInsertColumn={onInsertColumn}
        onDeleteColumn={onDeleteColumn}
        onInsertRow={onInsertRow}
        onMoveRow={onMoveRow}
        onDuplicateRow={onDuplicateRow}
        onDeleteRow={onDeleteRow}
      />

      <div className="mt-2">
        <button
          type="button"
          onClick={onAddRow}
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
        >
          + 행 추가
        </button>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "red";
}) {
  const valueColor =
    accent === "green"
      ? "text-green-600"
      : accent === "red"
        ? "text-red-600"
        : "text-gray-900";
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 sm:px-4 sm:py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-0.5 text-base font-bold sm:text-lg ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
