// 사이트 비밀번호(혜빈용) 해시를 Supabase에 한 번만 저장/검증하는 API.
// 평문은 저장하지 않고 클라이언트가 보낸 SHA-256 해시만 다룬다.
import postgres from "postgres";

export const dynamic = "force-dynamic";

const URL = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
const AUTH_ID = "auth";

let sql: ReturnType<typeof postgres> | null = null;
let ensured = false;

function db() {
  if (!URL) return null;
  if (!sql) sql = postgres(URL, { prepare: false });
  return sql;
}

async function ensureTable(client: ReturnType<typeof postgres>) {
  if (ensured) return;
  await client`
    create table if not exists workspace (
      id text primary key,
      data jsonb,
      updated_at timestamptz default now()
    )
  `;
  ensured = true;
}

async function storedHash(
  client: ReturnType<typeof postgres>,
): Promise<string | null> {
  const rows = await client`select data from workspace where id = ${AUTH_ID}`;
  const h = rows[0]?.data?.hyebinHash;
  return typeof h === "string" ? h : null;
}

// 비번이 이미 설정됐는지
export async function GET() {
  const client = db();
  if (!client) return Response.json({ configured: false, set: false });
  try {
    await ensureTable(client);
    return Response.json({ configured: true, set: Boolean(await storedHash(client)) });
  } catch {
    return Response.json({ configured: true, set: false });
  }
}

export async function POST(req: Request) {
  const client = db();
  if (!client) return Response.json({ configured: false, ok: false });
  try {
    await ensureTable(client);
    const body = await req.json();
    const action = body?.action;
    const hash = body?.hash;
    if (typeof hash !== "string" || hash.length < 16) {
      return Response.json({ ok: false });
    }

    if (action === "set") {
      // 최초 1회만 설정 가능 (이미 있으면 거부)
      if (await storedHash(client)) {
        return Response.json({ ok: false, already: true });
      }
      await client`
        insert into workspace (id, data, updated_at)
        values (${AUTH_ID}, ${client.json({ hyebinHash: hash })}, now())
        on conflict (id) do nothing
      `;
      return Response.json({ ok: true });
    }

    if (action === "verify") {
      const stored = await storedHash(client);
      return Response.json({ ok: true, match: Boolean(stored) && stored === hash });
    }

    return Response.json({ ok: false });
  } catch {
    return Response.json({ ok: false });
  }
}
