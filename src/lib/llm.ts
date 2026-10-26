import OpenAI from "openai";
import type { JsonSchema } from "./schemas";
import { timed } from "./trace";

/** Every LLM call in Grant Hunter goes through Nebius Token Factory's OpenAI-compatible API. */
export const TOKEN_FACTORY_BASE_URL = process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1/";

export type ModelTier = "nano" | "super" | "ultra";

/**
 * Nemotron IDs per tier, newest first. The first one Token Factory lists is used, unless
 * NEMOTRON_{NANO,SUPER,ULTRA}_MODEL is set.
 * nano: hunt query planning and page extraction (high volume, fast).
 * super: fit scoring and the daily digest.
 * ultra: deep fit analysis and application drafts (reasoning).
 */
export const MODEL_CANDIDATES: Record<ModelTier, string[]> = {
  nano: ["nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B", "nvidia/NVIDIA-Nemotron-Nano-9B-v2"],
  super: ["nvidia/nemotron-3-super-120b-a12b", "nvidia/Llama-3_3-Nemotron-Super-49B-v1_5"],
  ultra: ["nvidia/Nemotron-3-Ultra-550b-a55b", "nvidia/Llama-3_1-Nemotron-Ultra-253B-v1"],
};

const OVERRIDE_ENV: Record<ModelTier, string> = { nano: "NEMOTRON_NANO_MODEL", super: "NEMOTRON_SUPER_MODEL", ultra: "NEMOTRON_ULTRA_MODEL" };

export function pickModel(tier: ModelTier, available: string[], env: Record<string, string | undefined> = process.env) {
  const override = env[OVERRIDE_ENV[tier]];
  if (override) return override;
  const byLower = new Map(available.map((a) => [a.toLowerCase(), a]));
  for (const c of MODEL_CANDIDATES[tier]) {
    const hit = byLower.get(c.toLowerCase());
    if (hit) return hit;
  }
  const fuzzy = available.find((a) => /nemotron/i.test(a) && new RegExp(tier, "i").test(a) && !/(vl|embed|reward|guard|safety|parse)/i.test(a));
  return fuzzy ?? MODEL_CANDIDATES[tier][0];
}

let client: OpenAI | null = null;
function tokenFactory() {
  if (!process.env.NEBIUS_API_KEY) throw new Error("NEBIUS_API_KEY is not set");
  if (!client) client = new OpenAI({ apiKey: process.env.NEBIUS_API_KEY, baseURL: TOKEN_FACTORY_BASE_URL });
  return client;
}

export function llmConfigured() {
  return Boolean(process.env.NEBIUS_API_KEY);
}

let resolved: Promise<Record<ModelTier, string>> | null = null;

/** Match each tier to a Nemotron model that Token Factory actually serves (cached per server instance). */
export function resolveModels() {
  if (!resolved) {
    resolved = (async () => {
      let available: string[] = [];
      try {
        const page = await tokenFactory().models.list();
        available = page.data.map((m) => m.id);
      } catch {
        available = [];
      }
      // Retry the lookup on the next call if the model list was unavailable.
      if (available.length === 0) setTimeout(() => (resolved = null), 0);
      return { nano: pickModel("nano", available), super: pickModel("super", available), ultra: pickModel("ultra", available) };
    })();
  }
  return resolved;
}

type ChatOpts = {
  model: ModelTier;
  system: string;
  user: string;
  json?: boolean;
  /** Strict structured output; chatJson falls back to JSON mode if the model rejects it. */
  schema?: JsonSchema;
  /** Step name shown in the agent trace, e.g. "extract" or "score". */
  op?: string;
  maxTokens?: number;
  temperature?: number;
  thinking?: boolean;
};

function stripThinking(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^[\s\S]*?<\/think>/, "").trim();
}

/** Older Nemotron releases toggle reasoning with a system-prompt switch; newer ones need none. */
function reasoningSwitch(name: string, thinking: boolean) {
  if (/Nemotron-Nano-9B-v2/i.test(name)) return thinking ? "/think" : "/no_think";
  if (/Llama-3_[13]-Nemotron/i.test(name)) return `detailed thinking ${thinking ? "on" : "off"}`;
  return null;
}

export function responseFormat(json?: boolean, schema?: JsonSchema) {
  if (schema) return { response_format: { type: "json_schema" as const, json_schema: { name: schema.name, schema: schema.schema, strict: true } } };
  if (json) return { response_format: { type: "json_object" as const } };
  return {};
}

export async function chat({ model, system, user, json, schema, op, maxTokens = 2048, temperature = 0.2, thinking = false }: ChatOpts) {
  const name = (await resolveModels())[model];
  const sw = reasoningSwitch(name, thinking);
  const mode = schema ? "schema" : json ? "json" : "text";
  const res = await timed(
    { kind: "llm", op: op ?? model, model: name, detail: mode },
    () =>
      tokenFactory().chat.completions.create({
        model: name,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: sw ? `${sw}\n\n${system}` : system },
          { role: "user", content: user },
        ],
        ...responseFormat(json, schema),
      }),
    (r) => ({ promptTokens: r.usage?.prompt_tokens, completionTokens: r.usage?.completion_tokens }),
  );
  const text = stripThinking(res.choices[0]?.message?.content ?? "");
  return { text, model: name, usage: res.usage };
}

export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error("Model did not return JSON");
  }
}

/** Models that rejected json_schema; they go straight to JSON mode afterwards. */
const noSchema = new Set<string>();

export async function chatJson<T>(opts: Omit<ChatOpts, "json">): Promise<{ data: T; model: string }> {
  const name = (await resolveModels())[opts.model];
  const modes: ("schema" | "json" | "text")[] = opts.schema && !noSchema.has(name) ? ["schema", "json", "text"] : ["json", "text"];
  let lastErr: unknown;
  for (const mode of modes) {
    try {
      // Fall back from strict schema to JSON mode to plain text; the prompt always asks for JSON.
      const { text, model } = await chat({ ...opts, schema: mode === "schema" ? opts.schema : undefined, json: mode === "json" });
      return { data: parseJson<T>(text), model };
    } catch (e) {
      lastErr = e;
      const status = (e as { status?: number }).status;
      if (mode === "schema" && (status === 400 || status === 422)) noSchema.add(name);
    }
  }
  throw lastErr;
}
