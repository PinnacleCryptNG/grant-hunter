import { query } from "./db";
import type { Memory } from "./score";

export async function loadMemory(userId: string): Promise<Memory> {
  const rows = await query<{ title: string; status: string; feedback: string | null }>(
    `SELECT o.title, uo.status, uo.feedback FROM user_opportunities uo
     JOIN opportunities o ON o.id = uo.opportunity_id
     WHERE uo.user_id = $1 AND uo.status <> 'new'
     ORDER BY uo.updated_at DESC LIMIT 40`,
    [userId],
  );
  return {
    liked: rows.filter((r) => r.status === "saved").map((r) => r.title),
    applied: rows.filter((r) => r.status === "applied").map((r) => r.title),
    rejected: rows.filter((r) => r.status === "rejected").map((r) => ({ title: r.title, note: r.feedback })),
  };
}
