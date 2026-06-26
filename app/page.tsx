"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  emptyRow,
  newColumnKey,
  newRowId,
} from "@/lib/storage";
import { parseDate } from "@/lib/date";
import { buildSeedData } from "@/lib/seed";
import { buildMockWorkspace } from "@/lib/mock";
import {
  loadAuthMode,
  clearAuthMode,
  type AuthMode,
} from "@/lib/auth";
import { fetchRemote, saveRemote } from "@/lib/remote";
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
import { MonthlySummary } from "@/components/MonthlySummary";
import { MonthTabs } from "@/components/MonthTabs";
import { PasswordGate } from "@/components/PasswordGate";

export default function Page() {
  // 접근 모드: hyebin(실제) · admin(mock). null이면 잠금화면.
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    setMode(loadAuthMode());
    setAuthReady(true);
  }, []);

  const [ws, setWs] = useState<Workspace | null>(null);
  const [filter, setFilter] = useState<FilterState>(emptyFilter());
  const [filterKeys, setFilterKeys] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  // 월별 탭 기준 컬럼: 업로드일 / 입금일
  const [monthBasis, setMonthBasis] = useState<"uploadDate" | "paymentDate">(
    "uploadDate",
  );
  // 선택 월 "2026.06" · null이면 전체. 기본은 이번 달.
  const [monthTab, setMonthTab] = useState<string | null>(() => {
    const n = new Date();
    return `${n.getFullYear()}.${String(n.getMonth() + 1).padStart(2, "0")}`;
  });

  const skipSaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최초 로드: admin이면 mock, hyebin이면 서버(Supabase) 우선·없으면 localStorage
  useEffect(() => {
    if (!mode) return;
    if (mode === "admin") {
      skipSaveRef.current = true; // mock은 어디에도 저장하지 않음
      setWs(buildMockWorkspace());
      return;
    }
    let cancelled = false;
    (async () => {
      const remote = await fetchRemote();
      if (cancelled) return;
      if (remote) {
        const activeId = remote.sheets[0].id; // 표는 항상 메인(첫) 시트 기준
        skipSaveRef.current = true; // 방금 받아온 것을 다시 저장하지 않음
        setWs({ sheets: remote.sheets, activeId });
        saveWorkspace({ sheets: remote.sheets, activeId });
      } else {
        setWs(loadWorkspace()); // 서버 미설정/비어있음 → 로컬에서 시작(이후 서버로 업로드됨)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // 변경 시: 로컬 즉시 저장 + 서버 디바운스 저장 (admin/mock은 저장 안 함)
  useEffect(() => {
    if (!ws || mode !== "hyebin") return;
    saveWorkspace(ws);
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const snapshot = ws;
    saveTimerRef.current = setTimeout(() => {
      saveRemote(snapshot);
      saveTimerRef.current = null;
    }, 700);
  }, [ws, mode]);

  // 다른 기기에서 바뀐 내용 반영: 탭이 다시 보일 때 서버에서 최신본 가져오기
  useEffect(() => {
    if (mode !== "hyebin") return;
    const refetch = async () => {
      if (saveTimerRef.current) return; // 내가 방금 수정 중이면 건너뜀
      const remote = await fetchRemote();
      if (!remote) return;
      const activeId = remote.sheets[0].id;
      skipSaveRef.current = true;
      setWs({ sheets: remote.sheets, activeId });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode]);

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

  // 캘린더·월별정산은 활성 시트와 무관하게 모든 시트의 행을 합산해 보여준다.
  const overviewColumns = useMemo(
    () => ws?.sheets[0]?.columns ?? [],
    [ws],
  );
  const allRows = useMemo(
    () => ws?.sheets.flatMap((s) => s.rows) ?? [],
    [ws],
  );

  // 캘린더/월별정산이 함께 보는 월
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  // 월별 탭·정산 기준 날짜 컬럼 — 선택한 기준(업로드일/입금일)
  const monthDateKey = useMemo(() => {
    const sel = overviewColumns.find((c) => c.key === monthBasis);
    if (sel) return sel.key;
    const up = overviewColumns.find((c) => c.key === "uploadDate");
    if (up) return up.key;
    return overviewColumns.find((c) => c.type === "date")?.key ?? null;
  }, [overviewColumns, monthBasis]);
  const viewMonthStr = `${viewMonth.y}.${String(viewMonth.m + 1).padStart(2, "0")}`;
  // 월별 정산의 '이 달만 보기'는 월별 탭과 연동
  const monthFiltered = monthTab === viewMonthStr;

  // 선택한 월(업로드일 기준)으로 먼저 추린 뒤 필터/정렬 적용
  const monthRows = useMemo(() => {
    if (!monthTab || !monthDateKey) return rows;
    return rows.filter((r) => {
      const v = r[monthDateKey];
      if (typeof v !== "string") return false;
      const d = parseDate(v);
      return d ? `${d.y}.${String(d.m + 1).padStart(2, "0")}` === monthTab : false;
    });
  }, [rows, monthTab, monthDateKey]);

  const displayRows = useMemo(() => {
    const filtered = applyFilter(monthRows, columns, filter);
    return applySort(filtered, columns, sort);
  }, [monthRows, columns, filter, sort]);

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
    updateSheet((s) => {
      const row = emptyRow(s.columns);
      // 특정 월 탭을 보고 있으면 그 달 1일을 업로드일로 채워 탭에 남게 한다
      if (monthTab && monthDateKey) row[monthDateKey] = `${monthTab}.01`;
      return { ...s, rows: [...s.rows, row] };
    });
  }, [updateSheet, monthTab, monthDateKey]);

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

  const onLoadSeed = useCallback(() => {
    if (
      !confirm(
        "현재 시트의 행을 기초 데이터(VOVA·폴리오 등 18건)로 채울까요?\n기존에 입력한 행은 대체됩니다.",
      )
    )
      return;
    updateSheet((s) => ({ ...s, rows: buildSeedData().rows }));
  }, [updateSheet]);

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

  // 월별 탭 선택 시 캘린더·월별정산도 그 달로 맞춘다
  const onSelectMonthTab = useCallback((m: string | null) => {
    setMonthTab(m);
    if (m) {
      const [y, mm] = m.split(".").map(Number);
      setViewMonth({ y, m: mm - 1 });
    }
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

  const onLock = () => {
    clearAuthMode();
    setWs(null);
    setMode(null);
  };

  // 잠금 상태 처리
  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center text-pink-300">
        🤍
      </main>
    );
  }
  if (!mode) {
    return <PasswordGate onUnlock={setMode} />;
  }

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
      <header className="mb-4 text-center sm:text-left">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <h1 className="text-2xl font-extrabold tracking-tight text-pink-500 sm:text-3xl">
            🎀 혜빈이의 협찬 관리
          </h1>
          {mode === "admin" && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
              데모(mock)
            </span>
          )}
          <button
            type="button"
            onClick={onLock}
            className="ml-auto shrink-0 rounded-full border border-pink-200 px-3 py-1 text-xs font-medium text-pink-500 hover:bg-pink-50"
            title="잠금 화면으로"
          >
            🔒 잠그기
          </button>
        </div>
        <p className="mt-1 text-sm font-medium text-pink-400/80">
          오늘도 협찬 정리 화이팅! 💖
        </p>
        <p className="mt-1 hidden text-xs text-gray-400 sm:block">
          수식: <code className="rounded bg-pink-50 px-1">=D*0.033</code> (같은 행
          D열) · <code className="rounded bg-pink-50 px-1">=D2*0.033</code> · 수식
          입력 중 다른 셀을 클릭·드래그하면 참조가 들어갑니다.
        </p>
      </header>

      <CalendarView
        columns={overviewColumns}
        rows={allRows}
        view={viewMonth}
        onViewChange={setViewMonth}
      />

      <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <SummaryCard
          emoji="💰"
          label="광고비 총합"
          value={`₩ ${formatWon(summary.feeTotal)}`}
          tint="amber"
        />
        <SummaryCard
          emoji="✅"
          label="입금완료 합계"
          value={`₩ ${formatWon(summary.paidTotal)}`}
          tint="green"
        />
        <SummaryCard
          emoji="⏳"
          label="미입금 합계"
          value={`₩ ${formatWon(summary.unpaidTotal)}`}
          tint="rose"
        />
        <SummaryCard
          emoji="📋"
          label="건수"
          value={
            filterActive
              ? `${summary.shown} / ${summary.total}`
              : `${summary.total}`
          }
          tint="violet"
        />
      </section>

      <MonthlySummary
        columns={overviewColumns}
        rows={allRows}
        dateKey={monthDateKey}
        year={viewMonth.y}
        month={viewMonth.m}
        isFiltered={monthFiltered}
        onToggleFilter={() => setMonthTab(monthFiltered ? null : viewMonthStr)}
      />

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
            className="rounded-full bg-pink-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-pink-200 hover:bg-pink-600"
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

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onAddRow}
          className="rounded-full px-3 py-1 text-sm font-medium text-pink-500 hover:bg-pink-50"
        >
          + 행 추가
        </button>
        <button
          type="button"
          onClick={onLoadSeed}
          className="rounded-full px-3 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="VOVA·폴리오 등 기초 데이터 18건으로 채우기"
        >
          📥 기초 데이터 채우기
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-pink-100 pt-3">
        <span className="shrink-0 text-xs font-medium text-gray-400">월별</span>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-pink-50 p-0.5">
          {([
            ["uploadDate", "업로드일"],
            ["paymentDate", "입금일"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMonthBasis(key)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                monthBasis === key
                  ? "bg-pink-500 text-white"
                  : "text-pink-500 hover:bg-pink-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <MonthTabs
          rows={rows}
          dateKey={monthDateKey}
          active={monthTab}
          onSelect={onSelectMonthTab}
        />
      </div>
    </main>
  );
}

const TINTS: Record<string, { bg: string; value: string }> = {
  amber: { bg: "bg-amber-50 border-amber-100", value: "text-amber-600" },
  green: { bg: "bg-green-50 border-green-100", value: "text-green-600" },
  rose: { bg: "bg-rose-50 border-rose-100", value: "text-rose-500" },
  violet: { bg: "bg-violet-50 border-violet-100", value: "text-violet-600" },
};

function SummaryCard({
  emoji,
  label,
  value,
  tint,
}: {
  emoji: string;
  label: string;
  value: string;
  tint: "amber" | "green" | "rose" | "violet";
}) {
  const t = TINTS[tint];
  return (
    <div className={`rounded-2xl border ${t.bg} px-3 py-2.5 sm:px-4 sm:py-3`}>
      <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
        <span className="text-sm">{emoji}</span>
        {label}
      </div>
      <div className={`mt-1 text-base font-extrabold sm:text-lg ${t.value}`}>
        {value}
      </div>
    </div>
  );
}
