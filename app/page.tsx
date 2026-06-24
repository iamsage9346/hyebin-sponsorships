"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CellValue,
  Column,
  ColumnType,
  FilterState,
  Row,
  SheetData,
  SortState,
} from "@/lib/types";
import { loadData, saveData, emptyRow, newColumnKey, newRowId } from "@/lib/storage";
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

export default function Page() {
  const [data, setData] = useState<SheetData | null>(null);
  const [filter, setFilter] = useState<FilterState>(emptyFilter());
  const [filterKeys, setFilterKeys] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);

  useEffect(() => {
    setData(loadData());
  }, []);

  useEffect(() => {
    if (data) saveData(data);
  }, [data]);

  const columns = useMemo(() => data?.columns ?? [], [data]);
  const rows = useMemo(() => data?.rows ?? [], [data]);

  const displayRows = useMemo(() => {
    const filtered = applyFilter(rows, columns, filter);
    return applySort(filtered, columns, sort);
  }, [rows, columns, filter, sort]);

  const summary = useMemo(
    () => computeSummary(rows, displayRows),
    [rows, displayRows],
  );

  // ----- 셀 -----
  const onCellChange = useCallback(
    (rowId: string, key: string, value: CellValue) => {
      setData((d) =>
        d
          ? {
              ...d,
              rows: d.rows.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)),
            }
          : d,
      );
    },
    [],
  );

  // ----- 행 -----
  const onAddRow = useCallback(() => {
    setData((d) => (d ? { ...d, rows: [...d.rows, emptyRow(d.columns)] } : d));
  }, []);

  const onDeleteRow = useCallback((id: string) => {
    setData((d) => (d ? { ...d, rows: d.rows.filter((r) => r.id !== id) } : d));
  }, []);

  const onInsertRow = useCallback((id: string, where: "above" | "below") => {
    setData((d) => {
      if (!d) return d;
      const idx = d.rows.findIndex((r) => r.id === id);
      if (idx < 0) return d;
      const at = where === "above" ? idx : idx + 1;
      const rows = [...d.rows];
      rows.splice(at, 0, emptyRow(d.columns));
      return { ...d, rows };
    });
  }, []);

  const onMoveRow = useCallback((id: string, dir: "up" | "down") => {
    setData((d) => {
      if (!d) return d;
      const idx = d.rows.findIndex((r) => r.id === id);
      if (idx < 0) return d;
      const target = dir === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= d.rows.length) return d;
      const rows = [...d.rows];
      [rows[idx], rows[target]] = [rows[target], rows[idx]];
      return { ...d, rows };
    });
  }, []);

  const onDuplicateRow = useCallback((id: string) => {
    setData((d) => {
      if (!d) return d;
      const idx = d.rows.findIndex((r) => r.id === id);
      if (idx < 0) return d;
      const copy: Row = { ...d.rows[idx], id: newRowId() };
      const rows = [...d.rows];
      rows.splice(idx + 1, 0, copy);
      return { ...d, rows };
    });
  }, []);

  // ----- 컬럼 -----
  const onRenameColumn = useCallback((key: string, label: string) => {
    setData((d) =>
      d
        ? {
            ...d,
            columns: d.columns.map((c) => (c.key === key ? { ...c, label } : c)),
          }
        : d,
    );
  }, []);

  const onChangeColumnType = useCallback((key: string, type: ColumnType) => {
    setData((d) =>
      d
        ? {
            ...d,
            columns: d.columns.map((c) => (c.key === key ? { ...c, type } : c)),
          }
        : d,
    );
  }, []);

  const onInsertColumn = useCallback((key: string, side: "left" | "right") => {
    setData((d) => {
      if (!d) return d;
      const idx = d.columns.findIndex((c) => c.key === key);
      if (idx < 0) return d;
      const at = side === "left" ? idx : idx + 1;
      const col: Column = {
        key: newColumnKey(),
        label: "새 컬럼",
        type: "text",
        width: 120,
      };
      const columns = [...d.columns];
      columns.splice(at, 0, col);
      const rows = d.rows.map((r) => ({ ...r, [col.key]: null }));
      return { columns, rows };
    });
  }, []);

  const onDeleteColumn = useCallback((key: string) => {
    setData((d) =>
      d ? { ...d, columns: d.columns.filter((c) => c.key !== key) } : d,
    );
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
  const onAddFilterKey = useCallback((key: string) => {
    setFilterKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
  }, []);

  const onRemoveFilterKey = useCallback((key: string) => {
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

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-400">
        불러오는 중…
      </main>
    );
  }

  const filterActive = hasActiveFilter(filter);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">광고 협찬 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          셀을 클릭해 수정하고 Enter·Tab·방향키로 이동하세요. 변경 사항은 자동
          저장됩니다.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          수식: 셀에 <code className="rounded bg-gray-100 px-1">=D*0.033</code>{" "}
          (같은 행 D열) · <code className="rounded bg-gray-100 px-1">=D2*0.033</code>{" "}
          (특정 셀) · <code className="rounded bg-gray-100 px-1">=SUM(D1:D100)</code>{" "}
          처럼 입력하면 계산됩니다. (열 문자는 헤더의 회색 배지 참고)
        </p>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        sort={sort}
        onCellChange={onCellChange}
        onToggleSort={onToggleSort}
        onRenameColumn={onRenameColumn}
        onChangeColumnType={onChangeColumnType}
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
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}
