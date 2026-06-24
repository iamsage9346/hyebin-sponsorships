"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CellValue,
  FilterState,
  Row,
  SheetData,
  SortState,
} from "@/lib/types";
import { loadData, saveRows, emptyRow } from "@/lib/storage";
import {
  applyFilter,
  applySort,
  computeSummary,
  emptyFilter,
  formatWon,
  hasActiveFilter,
} from "@/lib/sheet";
import { SpreadsheetTable } from "@/components/SpreadsheetTable";

export default function Page() {
  const [data, setData] = useState<SheetData | null>(null);
  const [filter, setFilter] = useState<FilterState>(emptyFilter());
  const [sort, setSort] = useState<SortState | null>(null);

  // 최초 1회 localStorage 로드 (SSR 미스매치 방지)
  useEffect(() => {
    setData(loadData());
  }, []);

  // 행 변경 시 저장
  useEffect(() => {
    if (data) saveRows(data.rows);
  }, [data]);

  const columns = data?.columns ?? [];
  const rows = useMemo(() => data?.rows ?? [], [data]);

  const displayRows = useMemo(() => {
    const filtered = applyFilter(rows, columns, filter);
    return applySort(filtered, columns, sort);
  }, [rows, columns, filter, sort]);

  const summary = useMemo(
    () => computeSummary(rows, displayRows),
    [rows, displayRows],
  );

  function updateRows(updater: (rows: Row[]) => Row[]) {
    setData((d) => (d ? { ...d, rows: updater(d.rows) } : d));
  }

  function onCellChange(rowId: string, key: string, value: CellValue) {
    updateRows((rs) =>
      rs.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)),
    );
  }

  function onDeleteRow(rowId: string) {
    updateRows((rs) => rs.filter((r) => r.id !== rowId));
  }

  function onAddRow() {
    updateRows((rs) => [...rs, emptyRow()]);
  }

  function onToggleSort(key: string) {
    setSort((s) => {
      if (s?.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null; // 3번째 클릭 시 정렬 해제
    });
  }

  function onSelectFilter(key: string, values: string[]) {
    setFilter((f) => ({ ...f, selected: { ...f.selected, [key]: values } }));
  }

  function onSearchFilter(key: string, term: string) {
    setFilter((f) => ({ ...f, search: { ...f.search, [key]: term } }));
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-400">
        불러오는 중…
      </main>
    );
  }

  const filterActive = hasActiveFilter(filter);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">광고 협찬 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          셀을 클릭해 수정하고, Enter·Tab·방향키로 이동하세요. 변경 사항은 자동 저장됩니다.
        </p>
      </header>

      {/* 요약 영역 */}
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

      {/* 툴바 */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onAddRow}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 행 추가
        </button>
        {filterActive && (
          <button
            type="button"
            onClick={() => setFilter(emptyFilter())}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            필터 초기화
          </button>
        )}
        {sort && (
          <button
            type="button"
            onClick={() => setSort(null)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            정렬 해제
          </button>
        )}
      </div>

      <SpreadsheetTable
        columns={columns}
        rows={displayRows}
        filter={filter}
        sort={sort}
        onCellChange={onCellChange}
        onDeleteRow={onDeleteRow}
        onToggleSort={onToggleSort}
        onSelectFilter={onSelectFilter}
        onSearchFilter={onSearchFilter}
      />

      <div className="mt-2 flex justify-start">
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
