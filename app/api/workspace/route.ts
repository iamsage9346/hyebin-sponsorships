// 워크스페이스(전체 데이터)를 Supabase Postgres 한 행에 저장/조회하는 API.
// POSTGRES_URL(서버 전용)로 직접 접속 — 키가 클라이언트에 노출되지 않고 RLS 설정도 불필요.
import postgres from "postgres";

export const dynamic = "force-dynamic";

const URL = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
const ROW_ID = "default";

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

export async function GET() {
  const client = db();
  if (!client) return Response.json({ configured: false, data: null });
  try {
    await ensureTable(client);
    const rows = await client`select data from workspace where id = ${ROW_ID}`;
    return Response.json({ configured: true, data: rows[0]?.data ?? null });
  } catch {
    return Response.json({ configured: true, data: null });
  }
}

export async function PUT(req: Request) {
  const client = db();
  if (!client) return Response.json({ configured: false, ok: false });
  try {
    await ensureTable(client);
    const body = await req.json();
    await client`
      insert into workspace (id, data, updated_at)
      values (${ROW_ID}, ${client.json(body)}, now())
      on conflict (id) do update
        set data = excluded.data, updated_at = now()
    `;
    return Response.json({ configured: true, ok: true });
  } catch {
    return Response.json({ configured: true, ok: false });
  }
}
