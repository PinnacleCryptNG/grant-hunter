import { query } from "./db";
import { embed, llmConfigured } from "./llm";
import type { Memory, SimilarDecision } from "./score";
import type { Extracted } from "./types";

export function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Past decisions closest in meaning to the target, most similar first. */
export function nearest<T extends { embedding: number[] }>(target: number[], items: T[], k = 3, min = 0.5) {
  return items
    .map((it) => ({ it, similarity: cosine(target, it.embedding) }))
    .filter((x) => x.similarity >= min)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

export function embedText(title: string, x: Extracted) {
  return [title, x.kind, x.summary, x.organizer?.value, x.reward?.value, x.requiredSkills?.join(", ")].filter((s) => s && s !== "unknown").join("\n");
}

/** Embeds any of these opportunities that don't have an embedding yet (Token Factory embeddings API). */
async function ensureEmbeddings(ids: number[]) {
  const rows = await query<{ id: number; title: string; extracted: Extracted; embedding: number[] | null }>(
    "SELECT id, title, extracted, embedding FROM opportunities WHERE id = ANY($1)",
    [ids],
  );
  const missing = rows.filter((r) => !Array.isArray(r.embedding));
  if (missing.length) {
    const vectors = await embed(missing.map((r) => embedText(r.title, r.extracted)));
    await Promise.all(missing.map((r, i) => query("UPDATE opportunities SET embedding = $2 WHERE id = $1", [r.id, JSON.stringify(vectors[i])])));
    missing.forEach((r, i) => (r.embedding = vectors[i]));
  }
  return new Map(rows.map((r) => [r.id, r.embedding as number[]]));
}

export async function loadMemory(userId: string, forOpportunityId?: number): Promise<Memory> {
  const rows = await query<{ id: number; title: string; status: string; feedback: string | null }>(
    `SELECT o.id, o.title, uo.status, uo.feedback FROM user_opportunities uo
     JOIN opportunities o ON o.id = uo.opportunity_id
     WHERE uo.user_id = $1 AND uo.status <> 'new'
     ORDER BY uo.updated_at DESC LIMIT 40`,
    [userId],
  );
  const memory: Memory = {
    liked: rows.filter((r) => r.status === "saved").map((r) => r.title),
    applied: rows.filter((r) => r.status === "applied").map((r) => r.title),
    rejected: rows.filter((r) => r.status === "rejected").map((r) => ({ title: r.title, note: r.feedback })),
  };
  const past = rows.filter((r) => r.id !== forOpportunityId);
  if (forOpportunityId && past.length && llmConfigured()) {
    try {
      const vectors = await ensureEmbeddings([forOpportunityId, ...past.map((r) => r.id)]);
      const target = vectors.get(forOpportunityId);
      if (target) {
        const items = past.filter((r) => vectors.get(r.id)).map((r) => ({ ...r, embedding: vectors.get(r.id)! }));
        memory.similar = nearest(target, items).map<SimilarDecision>(({ it, similarity }) => ({ title: it.title, status: it.status, note: it.feedback, similarity }));
      }
    } catch {
      // Embeddings are an extra signal; scoring still has the title lists.
    }
  }
  return memory;
}
