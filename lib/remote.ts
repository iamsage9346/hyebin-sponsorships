import type { Workspace } from "./types";

/** 서버(Supabase)에서 워크스페이스를 불러온다. 미설정/실패 시 null */
export async function fetchRemote(): Promise<Workspace | null> {
  try {
    const res = await fetch("/api/workspace", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: Workspace | null };
    const data = json?.data;
    if (data && Array.isArray(data.sheets) && data.sheets.length > 0) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/** 서버(Supabase)에 워크스페이스를 저장한다. 성공 여부 반환 */
export async function saveRemote(ws: Workspace): Promise<boolean> {
  try {
    const res = await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ws),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    return Boolean(json?.ok);
  } catch {
    return false;
  }
}
