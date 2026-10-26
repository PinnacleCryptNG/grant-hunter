import { NextResponse } from "next/server";
import { llmConfigured, MODELS, TOKEN_FACTORY_BASE_URL } from "@/lib/llm";
import { tavilyConfigured } from "@/lib/tavily";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    tokenFactory: { configured: llmConfigured(), baseUrl: TOKEN_FACTORY_BASE_URL },
    tavily: { configured: tavilyConfigured() },
    models: MODELS,
    database: process.env.DATABASE_URL || process.env.POSTGRES_URL ? "postgres" : "pglite",
  });
}
