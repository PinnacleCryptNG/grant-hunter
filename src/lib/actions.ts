import type { Extracted, OpportunityKind, WorkType } from "./types";

export type DraftKind = "application" | "pitch" | "tweet" | "plan" | "writeup" | "article" | "outline" | "script" | "brief";

export const DRAFT_KINDS: Record<DraftKind, { label: string; hint: string }> = {
  application: { label: "Application", hint: "A full application with what you'll deliver, milestones and links." },
  pitch: { label: "Pitch", hint: "A 150-word pitch with three highlights." },
  plan: { label: "Build plan", hint: "An idea, MVP scope, stack and milestones up to the deadline." },
  writeup: { label: "Submission write-up", hint: "What it does, how you built it and what's next, ready to paste in." },
  article: { label: "First draft", hint: "A complete first draft of the piece the brief asks for." },
  outline: { label: "Outline", hint: "Angle, section headings, key points and sources to check." },
  tweet: { label: "X thread", hint: "A 3–4 post thread plus a one-line DM to the organiser." },
  script: { label: "Video script", hint: "Hook, voice-over, on-screen visuals and a shot list." },
  brief: { label: "Design brief", hint: "Concept, two or three directions and the deliverables required." },
};

const BY_WORK: Record<WorkType, DraftKind[]> = {
  build: ["plan", "writeup"],
  writing: ["article", "outline"],
  social: ["tweet"],
  video: ["script"],
  design: ["brief"],
  research: ["outline", "article"],
  other: ["application", "pitch"],
};

const KEYWORDS: [WorkType, RegExp][] = [
  ["video", /\b(video|youtube|tiktok|reels?|film|animation|livestream)\b/i],
  ["social", /\b(x thread|threads?|tweets?|twitter|memes?|social media)\b/i],
  ["design", /\b(design contest|figma|logo|illustration|artwork|poster|ui\/ux|branding)\b/i],
  ["writing", /\b(articles?|blog|essays?|writing|newsletter|long[- ]form|short story|poems?)\b/i],
  ["research", /\b(research report|deep dive|analysis report|research challenge|whitepaper)\b/i],
  ["build", /\b(build|develop|dapp|app|smart contracts?|sdk|api|integration|code|github|deploy|frontend|backend|protocol|tooling|audit)\b/i],
];

/** What the participant has to produce. Uses the extracted value when present, else keywords. */
export function workTypeOf(x: Pick<Extracted, "summary" | "requiredSkills" | "howToApply"> & { workType?: WorkType }, kind: OpportunityKind, title = ""): WorkType {
  if (x.workType && x.workType in BY_WORK) return x.workType;
  if (kind === "hackathon") return "build";
  const text = `${title} ${x.summary} ${(x.requiredSkills ?? []).join(" ")} ${x.howToApply?.value ?? ""}`;
  for (const [type, re] of KEYWORDS) if (re.test(text)) return type;
  return kind === "grant" ? "build" : "other";
}

export function draftKindsFor(kind: OpportunityKind, work: WorkType): DraftKind[] {
  const kinds = [...(kind === "grant" ? (["application"] as DraftKind[]) : []), ...BY_WORK[work]];
  return [...new Set(kinds)];
}
