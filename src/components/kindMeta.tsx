import { AtSign, Clapperboard, Code, FlaskConical, Hammer, Landmark, Palette, PenLine, Shapes, Sparkles, Target, Trophy, type LucideIcon } from "lucide-react";
import type { OpportunityKind, WorkType } from "@/lib/types";

const KINDS: Record<OpportunityKind, { label: string; icon: LucideIcon; tone: string }> = {
  grant: { label: "Grant", icon: Landmark, tone: "text-sky-300" },
  bounty: { label: "Bounty", icon: Target, tone: "text-amber-300" },
  hackathon: { label: "Hackathon", icon: Code, tone: "text-lime" },
  contest: { label: "Contest", icon: Trophy, tone: "text-violet-300" },
  other: { label: "Opportunity", icon: Sparkles, tone: "text-fg/70" },
  unknown: { label: "Opportunity", icon: Sparkles, tone: "text-fg/70" },
};

const WORK: Record<WorkType, { label: string; icon: LucideIcon }> = {
  build: { label: "Build", icon: Hammer },
  writing: { label: "Writing", icon: PenLine },
  video: { label: "Video", icon: Clapperboard },
  design: { label: "Design", icon: Palette },
  social: { label: "Social post", icon: AtSign },
  research: { label: "Research", icon: FlaskConical },
  other: { label: "Open format", icon: Shapes },
};

export function KindTag({ kind }: { kind: OpportunityKind }) {
  const k = KINDS[kind] ?? KINDS.other;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${k.tone}`}>
      <k.icon aria-hidden className="h-3.5 w-3.5" />
      {k.label}
    </span>
  );
}

export function WorkTag({ work }: { work: WorkType }) {
  const w = WORK[work];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg/55">
      <w.icon aria-hidden className="h-3.5 w-3.5" />
      {w.label}
    </span>
  );
}

const HUES = ["from-lime/30 to-lime/5 text-lime", "from-sky-400/30 to-sky-400/5 text-sky-200", "from-violet-400/30 to-violet-400/5 text-violet-200", "from-amber-400/30 to-amber-400/5 text-amber-200", "from-rose-400/30 to-rose-400/5 text-rose-200", "from-teal-400/30 to-teal-400/5 text-teal-200"];

/** Monogram tile for the organiser, coloured by name so the same organiser always looks the same. */
export function OrgMark({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const clean = name && name !== "unknown" ? name : "?";
  const initials = clean.split(/[\s\-_.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  let h = 0;
  for (const c of clean) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const dims = size === "lg" ? "h-16 w-16 rounded-2xl text-xl" : "h-12 w-12 rounded-xl text-base";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center bg-gradient-to-br font-display font-semibold ring-1 ring-inset ring-white/10 ${HUES[h % HUES.length]} ${dims}`}>
      {initials}
    </span>
  );
}
