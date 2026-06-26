"use client";

import { useState } from "react";
import { verifyPassword, saveAuthMode, type AuthMode } from "@/lib/auth";

interface Props {
  onUnlock: (mode: AuthMode) => void;
}

/** 비밀번호 잠금 화면 (RESTRICTED ACCESS 스타일) */
export function PasswordGate({ onUnlock }: Props) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking || pw.length === 0) return;
    setChecking(true);
    const mode = await verifyPassword(pw);
    setChecking(false);
    if (mode) {
      saveAuthMode(mode);
      onUnlock(mode);
    } else {
      setError(true);
      setPw("");
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#23262d] px-4">
      {/* 은은한 블러 배경 */}
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-rose-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-indigo-500/20 blur-[120px]" />

      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-7 font-mono text-gray-200 shadow-2xl backdrop-blur-xl"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/10 p-2.5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-200"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
              Restricted Access
            </div>
            <div className="text-lg font-semibold tracking-wide text-white">
              협찬 관리
            </div>
          </div>
        </div>

        {/* 입력 */}
        <div className="mt-7 text-[10px] uppercase tracking-[0.22em] text-gray-400">
          Access Code
        </div>
        <div
          className={`mt-2 flex items-center rounded-lg border bg-black/20 transition-colors ${
            error
              ? "border-red-500/50"
              : "border-white/10 focus-within:border-white/30"
          }`}
        >
          <input
            type="password"
            value={pw}
            autoFocus
            onChange={(e) => {
              setPw(e.target.value);
              setError(false);
            }}
            placeholder="Enter access code"
            className="flex-1 bg-transparent px-4 py-3 text-sm text-gray-100 outline-none placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={checking || pw.length === 0}
            className="m-1.5 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-gray-200 transition-colors hover:bg-white/20 disabled:opacity-40"
            aria-label="확인"
          >
            {checking ? "…" : "→"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-[11px] uppercase tracking-[0.15em] text-red-400">
            Invalid access code
          </p>
        )}

        {/* 푸터 */}
        <div className="mt-7 border-t border-white/10 pt-3 text-[10px] uppercase tracking-[0.22em] text-gray-500">
          Sponsorship · Authorized Access Only
        </div>
      </form>
    </main>
  );
}
