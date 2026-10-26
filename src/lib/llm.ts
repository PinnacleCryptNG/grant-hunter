import OpenAI from "openai";

/** Every LLM call in Grant Hunter goes through Nebius Token Factory's OpenAI-compatible API. */
export const TOKEN_FACTORY_BASE_URL = process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1/";

export const MODELS = {
  /** Nemotron Nano: hunt query planning and page extraction (high volume, fast). */
  nano: process.env.NEMOTRON_NANO_MODEL || "nvidia/NVIDIA-Nemotron-Nano-9B-v2",
  /** Nemotron Super: fit scoring and the daily digest. */
  super: process.env.NEMOTRON_SUPER_MODEL || "nvidia/Llama-3_3-Nemotron-Super-49B-v1_5",
  /** Nemotron Ultra: deep fit analysis and application drafts (reasoning). */
  ultra: process.env.NEMOTRON_ULTRA_MODEL || "nvidia/Llama-3_1-Nemotron-Ultra-253B-v1",
};

export type ModelTier = keyof typeof MODELS;

let client: OpenAI | null = null;
function tokenFactory() {
  if (!process.env.NEBIUS_API_KEY) throw new Error("NEBIUS_API_KEY is not set");
  if (!client) client = new OpenAI({ apiKey: process.env.NEBIUS_API_KEY, baseURL: TOKEN_FACTORY_BASE_URL });
  return client;
}

export function llmConfigured() {
  return Boolean(process.env.NEBIUS_API_KEY);
}

type ChatOpts = {
  model: ModelTier;
  system: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  thinking?: boolean;
};

function stripThinking(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^[\s\S]*?<\/think>/, "").trim();
}

export async function chat({ model, system, user, json, maxTokens = 2048, temperature = 0.2, thinking = false }: ChatOpts) {
  const name = MODELS[model];
  // Nemotron models toggle reasoning traces with a system-prompt switch.
  const thinkSwitch = name.includes("Nemotron-Nano-9B") || name.includes("NVIDIA-Nemotron") ? (thinking ? "/think" : "/no_think") : `detailed thinking ${thinking ? "on" : "off"}`;
  const res = await tokenFactory().chat.completions.create({
    model: name,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: `${thinkSwitch}\n\n${system}` },
      { role: "user", content: user },
    ],
    ...(json ? { response_format: { type: "json_object" as const } } : {}),
  });
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

export async function chatJson<T>(opts: Omit<ChatOpts, "json">): Promise<{ data: T; model: string }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { text, model } = await chat({ ...opts, json: true });
      return { data: parseJson<T>(text), model };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
