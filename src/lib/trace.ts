import { AsyncLocalStorage } from "node:async_hooks";
import { query } from "./db";

/** Which user, hunt and subject (opportunity URL or "opp:<id>") the current agent step belongs to. */
export type TraceCtx = { userId?: string; huntId?: number; subject?: string };

export type Step = {
  kind: "llm" | "tavily";
  op: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  ms: number;
  ok: boolean;
  detail?: string;
};

const als = new AsyncLocalStorage<TraceCtx>();

export function withTrace<T>(ctx: TraceCtx, fn: () => Promise<T>) {
  return als.run({ ...als.getStore(), ...ctx }, fn);
}

/** Logs one Nemotron or Tavily call. Outside a trace context (tests, eval script) nothing is written. */
export async function recordStep(s: Step) {
  const c = als.getStore();
  if (!c) return;
  try {
    await query(
      `INSERT INTO agent_steps (user_id, hunt_id, subject, kind, op, model, prompt_tokens, completion_tokens, ms, ok, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [c.userId ?? null, c.huntId ?? null, c.subject ?? null, s.kind, s.op, s.model ?? null, s.promptTokens ?? null, s.completionTokens ?? null, Math.round(s.ms), s.ok, s.detail?.slice(0, 300) ?? null],
    );
  } catch {
    // Tracing must never break a hunt.
  }
}

export async function timed<T>(step: Omit<Step, "ms" | "ok">, fn: () => Promise<T>, after?: (r: T) => Partial<Step>) {
  const t = Date.now();
  try {
    const r = await fn();
    await recordStep({ ...step, ...after?.(r), ms: Date.now() - t, ok: true });
    return r;
  } catch (e) {
    await recordStep({ ...step, ms: Date.now() - t, ok: false, detail: String(e instanceof Error ? e.message : e) });
    throw e;
  }
}
