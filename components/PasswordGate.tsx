"use client";

import { useEffect, useState } from "react";
import {
  verifyPassword,
  saveAuthMode,
  fetchAuthStatus,
  setupPassword,
  resetPassword,
  isAdminCode,
  type AuthMode,
} from "@/lib/auth";

interface Props {
  onUnlock: (mode: AuthMode) => void;
}

/** 비밀번호 잠금 화면 (RESTRICTED ACCESS 스타일). 최초 1회는 비번 설정. */
export function PasswordGate({ onUnlock }: Props) {
  const [ready, setReady] = useState(false);
  const [setupMode, setSetupMode] = useState(false); // true면 비번 설정 화면
  const [resetMode, setResetMode] = useState(false); // true면 관리자 초기화 화면

  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { configured, set } = await fetchAuthStatus();
      setSetupMode(configured && !set); // 서버는 있는데 아직 비번 미설정 → 설정
      setReady(true);
    })();
  }, []);

  const finish = (mode: AuthMode) => {
    saveAuthMode(mode);
    onUnlock(mode);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || pw.length === 0) return;
    setBusy(true);
    try {
      if (resetMode) {
        const ok = await resetPassword(pw);
        if (ok) {
          setResetMode(false);
          setSetupMode(true);
          setPw("");
          setConfirm("");
          setError("");
        } else {
          setError("관리자 코드가 아니에요");
          setPw("");
        }
        return;
      }
      if (setupMode) {
        // 설정 화면이라도 admin 데모 코드는 바로 입장
        if (await isAdminCode(pw)) return finish("admin");
        if (pw.trim().length < 4) {
          setError("4자 이상으로 정해 주세요");
          return;
        }
        if (pw !== confirm) {
          setError("두 번 입력한 코드가 달라요");
          return;
        }
        const ok = await setupPassword(pw);
        if (ok) finish("hyebin");
        else setError("설정에 실패했어요. 다시 시도해 주세요");
        return;
      }
      const mode = await verifyPassword(pw);
      if (mode) finish(mode);
      else {
        setError("Invalid access code");
        setPw("");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#23262d] font-mono text-xs uppercase tracking-[0.22em] text-gray-500">
        loading…
      </main>
    );
  }

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
              {resetMode
                ? "Admin Reset"
                : setupMode
                  ? "First-time Setup"
                  : "Restricted Access"}
            </div>
            <div className="text-lg font-semibold tracking-wide text-white">
              협찬 관리
            </div>
          </div>
        </div>

        {/* 입력 */}
        <div className="mt-7 text-[10px] uppercase tracking-[0.22em] text-gray-400">
          {resetMode ? "Admin Code" : setupMode ? "Set Access Code" : "Access Code"}
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
              setError("");
            }}
            placeholder={
              resetMode
                ? "Enter admin code"
                : setupMode
                  ? "Create access code"
                  : "Enter access code"
            }
            className="flex-1 bg-transparent px-4 py-3 text-sm text-gray-100 outline-none placeholder:text-gray-500"
          />
          {!setupMode && (
            <button
              type="submit"
              disabled={busy || pw.length === 0}
              className="m-1.5 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-gray-200 transition-colors hover:bg-white/20 disabled:opacity-40"
              aria-label="확인"
            >
              {busy ? "…" : "→"}
            </button>
          )}
        </div>

        {/* 설정 모드: 확인 입력 + 버튼 */}
        {setupMode && (
          <>
            <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-gray-400">
              Confirm Access Code
            </div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError("");
              }}
              placeholder="Re-enter access code"
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-100 outline-none transition-colors placeholder:text-gray-500 focus:border-white/30"
            />
            <button
              type="submit"
              disabled={busy || pw.length === 0}
              className="mt-4 w-full rounded-lg border border-white/10 bg-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-white/25 disabled:opacity-40"
            >
              {busy ? "…" : "Set & Enter"}
            </button>
          </>
        )}

        {error && (
          <p className="mt-2 text-[11px] uppercase tracking-[0.15em] text-red-400">
            {error}
          </p>
        )}

        {/* 비번 잊음 → 관리자 초기화 / 돌아가기 */}
        {!setupMode && (
          <div className="mt-4 text-right">
            <button
              type="button"
              onClick={() => {
                setResetMode((v) => !v);
                setPw("");
                setConfirm("");
                setError("");
              }}
              className="text-[10px] uppercase tracking-[0.18em] text-gray-500 hover:text-gray-300"
            >
              {resetMode ? "← Back to login" : "Forgot? Admin reset"}
            </button>
          </div>
        )}

        {/* 푸터 */}
        <div className="mt-7 border-t border-white/10 pt-3 text-[10px] uppercase tracking-[0.22em] text-gray-500">
          {resetMode
            ? "Admin code resets the access code"
            : setupMode
              ? "Set your code · used from next time"
              : "Sponsorship · Authorized Access Only"}
        </div>
      </form>
    </main>
  );
}
