"use client";

import { useEffect, useRef, useState } from "react";
import type { Sheet } from "@/lib/types";

interface Props {
  sheets: Sheet[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function SheetTabs({
  sheets,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  const startRename = (s: Sheet) => {
    setEditingId(s.id);
    setDraft(s.name);
  };
  const commitRename = () => {
    if (editingId) onRename(editingId, draft.trim() || "시트");
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 pb-px">
      {sheets.map((s) => {
        const active = s.id === activeId;
        if (editingId === s.id) {
          return (
            <input
              key={s.id}
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-28 rounded-t-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
            />
          );
        }
        return (
          <div
            key={s.id}
            className={`group flex shrink-0 items-center rounded-t-xl border-b-2 ${
              active
                ? "border-pink-500 bg-white text-pink-600"
                : "border-transparent text-gray-400 hover:bg-pink-50"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              onDoubleClick={() => startRename(s)}
              className="max-w-[160px] truncate px-3 py-1.5 text-sm font-medium"
              title="더블클릭하여 이름 변경"
            >
              {s.name}
            </button>
            {active && sheets.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`'${s.name}' 시트를 삭제할까요?`)) onDelete(s.id);
                }}
                className="pr-2 text-gray-300 hover:text-red-500"
                title="시트 삭제"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 rounded-full px-2 py-1.5 text-lg text-pink-400 hover:bg-pink-50 hover:text-pink-600"
        title="시트 추가"
      >
        +
      </button>
    </div>
  );
}
