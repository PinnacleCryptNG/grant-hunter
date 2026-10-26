import { NextResponse } from "next/server";
import { llmConfigured, MODEL_CANDIDATES, resolveModels, TOKEN_FACTORY_BASE_URL } from "@/lib/llm";
import { tavilyConfigured } from "@/lib/tavily";
import { githubConfigured } from "@/lib/auth";
import { telegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    tokenFactory: { configured: llmConfigured(), baseUrl: TOKEN_FACTORY_BASE_URL },
    tavily: { configured: tavilyConfigured() },
    models: llmConfigured() ? await resolveModels() : { nano: MODEL_CANDIDATES.nano[0], super: MODEL_CANDIDATES.super[0], ultra: MODEL_CANDIDATES.ultra[0] },
    signIn: { github: githubConfigured() },
    delivery: { telegram: telegramConfigured() },
    database: process.env.DATABASE_URL || process.env.POSTGRES_URL ? "postgres" : "pglite",
  });
}
