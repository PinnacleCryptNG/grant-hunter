import { chat, chatJson } from "./llm";
import { memoryBrief, opportunityBrief, profileBrief, type Memory } from "./score";
import type { Extracted, Profile } from "./types";

import type { DraftKind } from "./actions";

export type { DraftKind };

const DRAFT_SYSTEM = `You are Grant Hunter's writing module. Draft a submission the USER will review, edit and submit themselves. Nothing is sent automatically.
Rules:
- Write in the first person as the user, in a confident, specific, non-generic voice.
- Never invent facts about the user: achievements, metrics, employers and links come ONLY from the profile and portfolio.
- For content pieces (articles, threads, scripts), write about the brief's topic but never invent statistics, quotes or sources; mark claims that need one with [Check: source].
- Tie the user's concrete portfolio items to the opportunity's requirements.
- If the opportunity's requirements are unknown, write a strong general application and add a short "[Check: ...]" note where the user must confirm something.
- Format in Markdown with short sections. No preamble like "Here is your draft".`;

const FORMATS: Record<DraftKind, string> = {
  application: "A full application: Title, One-liner, About me, Why this opportunity, What I'll build/deliver (with milestones if a grant), Relevant work (portfolio links), Timeline, Budget/Reward ask if relevant, Links.",
  pitch: "A 150-word elevator pitch plus 3 bullet highlights.",
  tweet: "A short X/Twitter thread (3-4 posts) for the user's entry or submission, plus a 1-line DM to the organiser.",
  plan: "A build plan for this hackathon or bounty: Project idea (1-2 options tied to the brief or tracks), Why it can win (map to the stated judging criteria or requirements; add [Check: judging criteria] if they are unknown), MVP scope, Tech stack (from the user's skills), Milestones up to the deadline, Risks, Submission checklist (from How to apply).",
  writeup: "A project submission write-up in the usual Devpost/bounty format: Inspiration, What it does, How I built it, Challenges, Accomplishments, What's next. Use [placeholders] for project details the user has not given; do not invent features or results.",
  article: "A complete first draft (600-900 words) of the written piece the brief asks for: title, hook, sections with subheadings, conclusion. Match any topic, length or format rules on the page.",
  outline: "A detailed outline: working title, angle, 5-7 section headings with key points under each, and the sources the user should look up.",
  script: "A video script: hook for the first 5 seconds, then sections with voice-over and on-screen visuals for each, a call to action, the target length, and a shot list.",
  brief: "A design brief: concept, 2-3 visual directions, the deliverables and formats the brief requires, style notes and a timeline.",
};

export async function draftApplication(x: Extracted, url: string, profile: Profile, memory: Memory, kind: DraftKind, extraNotes?: string) {
  const format = FORMATS[kind] ?? FORMATS.application;
  return chat({
    model: "ultra",
    op: "draft",
    thinking: false,
    maxTokens: kind === "article" ? 3200 : 2200,
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
