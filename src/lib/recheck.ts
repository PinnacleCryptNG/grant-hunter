import { query } from "./db";
import { extractOpportunity } from "./extract";
import { normalizeUrl } from "./hunt";
import { tavilyExtract } from "./tavily";
import { withTrace } from "./trace";
import type { Extracted } from "./types";

/** What changed on the page since it was first read, in plain words. */
export function termChanges(before: Extracted, after: Extracted) {
  const out: string[] = [];
  if (after.openStatus === "closed" && before.openStatus !== "closed") out.push("now closed");
  if (after.deadline.value !== "unknown" && (after.deadlineIso ?? null) !== (before.deadlineIso ?? null)) out.push(`deadline now ${after.deadline.value}`);
  if (after.reward.value !== "unknown" && after.reward.value !== before.reward.value) out.push(`reward now ${after.reward.value}`);
  return out;
}

/**
 * Re-reads saved opportunities (at most once a day each) so the digest doesn't show a closed
 * listing or a moved deadline. Same Tavily Extract + Nemotron extraction + evidence check as a hunt.
 */
export async function recheckSaved(userId: string, { limit = 5 } = {}) {
  const rows = await query<{ id: number; url: string; title: string; extracted: Extracted }>(
    `SELECT o.id, o.url, o.title, o.extracted FROM user_opportunities uo JOIN opportunities o ON o.id = uo.opportunity_id
     WHERE uo.user_id = $1 AND uo.status = 'saved' AND (o.deadline_at IS NULL OR o.deadline_at > now())
       AND COALESCE(o.checked_at, o.updated_at) < now() - interval '20 hours'
     ORDER BY o.deadline_at ASC NULLS LAST LIMIT $2`,
    [userId, limit],
  );
  if (!rows.length) return [];
  return withTrace({ userId }, async () => {
    const pages = new Map((await tavilyExtract(rows.map((r) => r.url))).map((p) => [normalizeUrl(p.url), p.raw_content]));
    const results: { id: number; changes: string[] }[] = [];
    for (const r of rows) {
      const text = pages.get(normalizeUrl(r.url));
      try {
        if (!text) throw new Error("unreadable");
        const { extracted } = await withTrace({ subject: r.url }, () => extractOpportunity({ url: r.url, title: r.title, text }));
        if (!extracted.isSingleOpportunity) throw new Error("page changed");
        const changes = termChanges(r.extracted, extracted);
        const note = changes.length ? `Re-checked: ${changes.join("; ")}.` : "Re-checked: terms unchanged.";
        await query("UPDATE opportunities SET extracted = $2, deadline_at = $3, checked_at = now(), recheck_note = $4, updated_at = now() WHERE id = $1", [
          r.id,
          JSON.stringify(extracted),
          extracted.deadlineIso,
          note,
        ]);
        if (changes.length) await query("INSERT INTO events (user_id, opportunity_id, action, note) VALUES ($1, $2, 'recheck', $3)", [userId, r.id, note]);
        results.push({ id: r.id, changes });
      } catch {
        await query("UPDATE opportunities SET checked_at = now(), recheck_note = $2 WHERE id = $1", [r.id, "Re-check couldn't read the page; showing the terms from the first read."]);
      }
    }
    return results;
  });
}
