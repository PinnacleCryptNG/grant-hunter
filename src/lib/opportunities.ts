import { one, query } from "./db";
import type { OpportunityRow } from "./types";

const SELECT = `SELECT o.id, o.url, o.title, o.source, o.kind, o.snippet, o.extracted, o.deadline_at, o.found_by_query, o.model, o.created_at,
  uo.score, uo.scoring, uo.status, uo.feedback, uo.model AS scoring_model, uo.analysis
  FROM user_opportunities uo JOIN opportunities o ON o.id = uo.opportunity_id`;

export type ListedOpportunity = OpportunityRow & { analysis: unknown };

export async function listOpportunities(userId: string) {
  return query<ListedOpportunity>(`${SELECT} WHERE uo.user_id = $1 ORDER BY uo.score DESC NULLS LAST, o.deadline_at ASC NULLS LAST`, [userId]);
}

export async function getOpportunity(userId: string, id: number) {
  return one<ListedOpportunity>(`${SELECT} WHERE uo.user_id = $1 AND o.id = $2`, [userId, id]);
}

export function isActive(o: Pick<OpportunityRow, "deadline_at" | "extracted">) {
  if (o.extracted.openStatus === "closed") return false;
  return !o.deadline_at || new Date(o.deadline_at).getTime() > Date.now();
}
