// 사이트 접근 잠금 (가벼운 가림용 클라이언트 잠금).
// 비밀번호 평문은 코드에 두지 않고 SHA-256 해시만 비교한다.

export type AuthMode = "hyebin" | "admin";

const HASHES: Record<string, AuthMode> = {
  // hyebin1004 → 실제 데이터
  "360329f1b1f67e14655a6ce69b9ba20904e20711200577df93f6eeab7722c802": "hyebin",
  // admin1004 → mock 데이터(데모용, 실제 데이터 안 건드림)
  "b4f9ffa70ae677cdc2be4ee64e612a239221bc99f3be6ddb45bce0ba5bb76af1": "admin",
};

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

/** 비밀번호를 확인해 모드를 돌려준다. 틀리면 null */
export async function verifyPassword(input: string): Promise<AuthMode | null> {
  const hash = await sha256(input.trim());
  return HASHES[hash] ?? null;
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
