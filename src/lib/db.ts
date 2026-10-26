import { SCHEMA } from "./schema";

type Row = Record<string, unknown>;
type QueryFn = (sql: string, params?: unknown[]) => Promise<Row[]>;

// Kept on globalThis so every route bundle in `next dev` shares one embedded PGlite instance.
const g = globalThis as { __ghDb?: { queryFn: Promise<QueryFn> | null; migrated: Promise<void> | null } };
const state = (g.__ghDb ??= { queryFn: null, migrated: null });

async function createQueryFn(): Promise<QueryFn> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    return async (text, params = []) => (await sql.query(text, params)) as Row[];
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || (process.env.VERCEL ? "/tmp/grant-hunter-db" : "./.data/pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  return async (text, params = []) => (await db.query<Row>(text, params)).rows;
}

async function raw(): Promise<QueryFn> {
  if (!state.queryFn) state.queryFn = createQueryFn().catch((e) => { state.queryFn = null; throw e; });
  return state.queryFn;
}

async function migrate() {
  const q = await raw();
  for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
    await q(stmt);
  }
}

export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!state.migrated) state.migrated = migrate().catch((e) => { state.migrated = null; throw e; });
  await state.migrated;
  const q = await raw();
  return (await q(sql, params)) as T[];
}

export async function one<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
