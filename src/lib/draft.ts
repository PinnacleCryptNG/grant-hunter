import { chat, chatJson } from "./llm";
import { memoryBrief, opportunityBrief, profileBrief, type Memory } from "./score";
import type { Extracted, Profile } from "./types";

export type DraftKind = "application" | "pitch" | "tweet";

const DRAFT_SYSTEM = `You are Grant Hunter's writing module. Draft a submission the USER will review, edit and submit themselves. Nothing is sent automatically.
Rules:
- Write in the first person as the user, in a confident, specific, non-generic voice.
- Use ONLY facts from the user's profile and portfolio. Never invent achievements, metrics, employers or links.
- Tie the user's concrete portfolio items to the opportunity's requirements.
- If the opportunity's requirements are unknown, write a strong general application and add a short "[Check: ...]" note where the user must confirm something.
- Format in Markdown with short sections. No preamble like "Here is your draft".`;

export async function draftApplication(x: Extracted, url: string, profile: Profile, memory: Memory, kind: DraftKind, extraNotes?: string) {
  const format =
    kind === "pitch"
      ? "A 150-word elevator pitch plus 3 bullet highlights."
      : kind === "tweet"
        ? "A short X/Twitter thread (3-4 posts) announcing the user's submission, plus a 1-line DM to the organiser."
        : "A full application: Title, One-liner, About me, Why this opportunity, What I'll build/deliver (with milestones if a grant), Relevant work (portfolio links), Timeline, Budget/Reward ask if relevant, Links.";
  return chat({
    model: "ultra",
    op: "draft",
    thinking: false,
    maxTokens: 2200,
    temperature: 0.6,
    system: DRAFT_SYSTEM,
    user: `FORMAT: ${format}\nOPPORTUNITY URL: ${url}\nOPPORTUNITY: ${opportunityBrief(x)}\nHOW TO APPLY: ${x.howToApply.value}\nUSER PROFILE: ${profileBrief(profile)}\nLINKS: ${JSON.stringify(profile.links)}\nPORTFOLIO: ${JSON.stringify(profile.portfolio)}\nMEMORY: ${memoryBrief(memory)}${extraNotes ? `\nUSER NOTES FOR THIS DRAFT: ${extraNotes}` : ""}`,
  });
}

export type Analysis = {
  summary: string;
  strengths: string[];
  gaps: string[];
  questionsToVerify: string[];
  effortEstimateHours: number | null;
  expectedValueNote: string;
  recommendation: "apply" | "maybe" | "skip";
};

export async function analyzeFit(x: Extracted, profile: Profile, memory: Memory) {
  return chatJson<Analysis>({
    model: "ultra",
    op: "analyze",
    thinking: true,
    maxTokens: 4000,
    temperature: 0.3,
    system: `You are Grant Hunter's reasoning module. Think carefully about whether this user should pursue this opportunity. Use only the given facts; treat "unknown" as unknown and list what must be verified.
Return JSON: {"summary": string, "strengths": string[], "gaps": string[], "questionsToVerify": string[], "effortEstimateHours": number|null, "expectedValueNote": string (compare reward with effort x hourly rate when both known), "recommendation": "apply"|"maybe"|"skip"}`,
    user: `NOW: ${new Date().toISOString()}\nUSER PROFILE: ${profileBrief(profile)}\nMEMORY: ${memoryBrief(memory)}\nOPPORTUNITY: ${opportunityBrief(x)}`,
  });
}
