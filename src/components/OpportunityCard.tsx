"use client";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Clock, RotateCcw, TriangleAlert, X } from "lucide-react";
import { workTypeOf } from "@/lib/actions";
import { formatDeadline, hostOf, timeLeft } from "@/lib/format";
import { markdownToText } from "@/lib/text";
import type { OpportunityRow, Status } from "@/lib/types";
import { KindTag, OrgMark, WorkTag } from "./kindMeta";
import { ScoreBadge } from "./ScoreBadge";

const urgencyTone = { urgent: "text-rose-300", soon: "text-amber-300", later: "text-fg/75", closed: "text-fg/40", unknown: "text-fg/40" };
const iconBtn = "grid h-8 w-8 place-items-center rounded-full text-fg/50 ring-1 ring-white/10 transition hover:bg-white/[0.06] hover:text-fg";

export function OpportunityCard({ o, tz, onStatus }: { o: OpportunityRow; tz: string; onStatus: (s: Status) => void }) {
  const x = o.extracted;
  const org = x.organizer.value !== "unknown" ? markdownToText(x.organizer.value) : "";
  const reward = x.reward.value !== "unknown" ? markdownToText(x.reward.value) : null;
  const risks = o.scoring?.risks?.length ?? 0;
  const left = timeLeft(o.deadline_at, Date.now());
  const saved = o.status === "saved";
  const days = Math.floor(left.ms / 86400000);
  const label = left.urgency !== "closed" && left.urgency !== "unknown" && days >= 1 ? `${days} day${days > 1 ? "s" : ""} left` : left.urgency === "unknown" ? "No deadline" : left.label;
  return (
    <li className="group relative flex min-w-0 flex-col rounded-3xl bg-surface/70 p-6 ring-1 ring-white/[0.07] transition duration-300 hover:-translate-y-0.5 hover:bg-surface hover:ring-white/15">
      <div className="flex items-center gap-3">
        <OrgMark name={org || o.source || hostOf(o.url)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg/85">{org || hostOf(o.url)}</p>
          <p className="truncate text-xs text-fg/40">{hostOf(o.url)}</p>
        </div>
        <ScoreBadge score={o.score} size={48} />
      </div>

      <Link href={`/o/${o.id}`} className="mt-5 line-clamp-2 text-lg font-semibold leading-snug text-fg after:absolute after:inset-0">
        {o.title}
      </Link>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-fg/55">{o.scoring?.verdict || markdownToText(x.summary)}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/[0.04] px-2.5 py-1 ring-1 ring-white/[0.07]"><KindTag kind={o.kind} /></span>
        <span className="rounded-full bg-white/[0.04] px-2.5 py-1 ring-1 ring-white/[0.07]"><WorkTag work={workTypeOf(x, o.kind, o.title)} /></span>
        {risks > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-400/[0.08] px-2.5 py-1 text-xs font-medium text-rose-300 ring-1 ring-rose-400/20">
            <TriangleAlert className="h-3.5 w-3.5" />
            {risks} risk{risks > 1 ? "s" : ""}
          </span>
        )}
        <div className="relative z-10 ml-auto flex gap-1.5">
          <button type="button" aria-label={saved ? "Unsave" : "Save"} title={saved ? "Saved" : "Save"} onClick={() => onStatus(saved ? "new" : "saved")} className={saved ? "grid h-8 w-8 place-items-center rounded-full bg-lime text-night" : iconBtn}>
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
          <button type="button" aria-label={o.status === "rejected" ? "Restore" : "Not for me"} title={o.status === "rejected" ? "Restore" : "Not for me"} onClick={() => onStatus(o.status === "rejected" ? "new" : "rejected")} className={iconBtn}>
            {o.status === "rejected" ? <RotateCcw className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-auto pt-5">
      <div className="flex items-end justify-between gap-4 border-t border-white/[0.06] pt-4">
        <p title={reward ?? undefined} className={`min-w-0 truncate font-display text-xl font-semibold ${reward ? "text-lime" : "text-fg/35"}`}>{reward ?? "Reward not stated"}</p>
        <p suppressHydrationWarning title={o.deadline_at ? formatDeadline(o.deadline_at, tz) : undefined} className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-medium tabular-nums ${urgencyTone[left.urgency]}`}>
          <Clock className="h-4 w-4" />
          {label}
        </p>
      </div>
      </div>
    </li>
  );
}
