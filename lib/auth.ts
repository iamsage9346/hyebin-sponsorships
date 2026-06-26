// 사이트 접근 잠금 (가벼운 가림용).
// 혜빈 비번은 최초 1회 사용자가 직접 설정 → 서버(Supabase)에 해시 저장.
// admin(데모) 비번은 고정. 평문은 코드/DB에 두지 않고 SHA-256 해시만 비교.

export type AuthMode = "hyebin" | "admin";

// admin1004 → mock 데모 모드 (고정)
const ADMIN_HASH =
  "b4f9ffa70ae677cdc2be4ee64e612a239221bc99f3be6ddb45bce0ba5bb76af1";
// hyebin1004 → DB 미설정(로컬 등) 환경에서의 기본 비번
const FALLBACK_HYEBIN_HASH =
  "360329f1b1f67e14655a6ce69b9ba20904e20711200577df93f6eeab7722c802";

const AUTH_KEY = "hyebin-sponsorships:auth";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 입력이 admin 데모 비번인지 (로컬 해시 비교) */
export async function isAdminCode(input: string): Promise<boolean> {
  return (await sha256(input.trim())) === ADMIN_HASH;
}

interface AuthStatus {
  configured: boolean; // 서버 DB 연결됨?
  set: boolean; // 혜빈 비번이 이미 설정됨?
}

/** 서버에 비번이 설정됐는지 조회 */
export async function fetchAuthStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch("/api/auth", { cache: "no-store" });
    if (!res.ok) return { configured: false, set: false };
    const j = (await res.json()) as AuthStatus;
    return { configured: Boolean(j.configured), set: Boolean(j.set) };
  } catch {
    return { configured: false, set: false };
  }
}

/** 최초 1회 혜빈 비번 설정. 성공 여부 반환 */
export async function setupPassword(plain: string): Promise<boolean> {
  const hash = await sha256(plain.trim());
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", hash }),
    });
    const j = (await res.json()) as { ok?: boolean };
    return Boolean(j?.ok);
  } catch {
    return false;
  }
}

/** 비밀번호 확인 → 모드. 틀리면 null */
export async function verifyPassword(input: string): Promise<AuthMode | null> {
  const hash = await sha256(input.trim());
  if (hash === ADMIN_HASH) return "admin";

  const status = await fetchAuthStatus();
  if (!status.configured) {
    // DB 미설정 환경: 기본 비번 허용
    return hash === FALLBACK_HYEBIN_HASH ? "hyebin" : null;
  }
  if (!status.set) {
    // 아직 설정 전이면 통과 불가 (설정 화면에서 만들어야 함)
    return null;
  }
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", hash }),
    });
    const j = (await res.json()) as { match?: boolean };
    return j?.match ? "hyebin" : null;
  } catch {
    return null;
  }
}

export function loadAuthMode(): AuthMode | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(AUTH_KEY);
  return v === "hyebin" || v === "admin" ? v : null;
}

export function saveAuthMode(mode: AuthMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, mode);
}

export function clearAuthMode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
}
