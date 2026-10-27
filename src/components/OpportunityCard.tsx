"use client";
import Link from "next/link";
import { Bookmark, BookmarkCheck, RotateCcw, TriangleAlert, X } from "lucide-react";
import { workTypeOf } from "@/lib/actions";
import { formatDeadline, hostOf } from "@/lib/format";
import { markdownToText } from "@/lib/text";
import type { OpportunityRow, Status } from "@/lib/types";
import { Countdown } from "./Countdown";
import { KindTag, OrgMark, WorkTag } from "./kindMeta";
import { ScoreBadge } from "./ScoreBadge";
import { StatusPill } from "./StatusPill";

const btn = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition";

export function OpportunityCard({ o, tz, onStatus }: { o: OpportunityRow; tz: string; onStatus: (s: Status) => void }) {
  const x = o.extracted;
  const org = x.organizer.value !== "unknown" ? markdownToText(x.organizer.value) : "";
  const reward = x.reward.value !== "unknown" ? markdownToText(x.reward.value) : null;
  const risks = o.scoring?.risks?.length ?? 0;
  return (
    <li className="group relative overflow-hidden rounded-2xl bg-surface/70 ring-1 ring-white/[0.07] transition duration-300 hover:-translate-y-0.5 hover:bg-surface hover:ring-white/15">
      <span aria-hidden className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-lime/0 to-transparent transition duration-500 group-hover:via-lime/70" />
      <div className="flex gap-4 p-5 sm:gap-5 sm:p-6">
        <OrgMark name={org || o.source || hostOf(o.url)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <KindTag kind={o.kind} />
            <WorkTag work={workTypeOf(x, o.kind, o.title)} />
            {o.status !== "new" && <StatusPill status={o.status} />}
          </div>
          <Link href={`/o/${o.id}`} className="mt-2 line-clamp-2 text-[1.05rem] font-semibold leading-snug text-fg after:absolute after:inset-0 sm:text-lg">
            {o.title}
          </Link>
          <p className="mt-1 truncate text-sm text-fg/45">
            {org && <span className="text-fg/70">{org}</span>}
            {org && " · "}
            {hostOf(o.url)}
          </p>
          <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-fg/60">{o.scoring?.verdict || markdownToText(x.summary)}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ScoreBadge score={o.score} size={56} />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">Fit</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/[0.06] bg-white/[0.015] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">Reward</p>
          <p className={`mt-0.5 max-w-[16rem] truncate font-display text-base font-semibold ${reward ? "text-lime" : "text-fg/40"}`}>{reward ?? "Not stated"}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">Deadline</p>
          <div className="mt-1 flex items-center gap-2">
            <Countdown iso={o.deadline_at} />
            {o.deadline_at && <span className="hidden text-xs text-fg/45 md:inline" suppressHydrationWarning>{formatDeadline(o.deadline_at, tz)}</span>}
          </div>
        </div>
        <div className="relative z-10 ml-auto flex items-center gap-2">
          {risks > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-300">
              <TriangleAlert className="h-3.5 w-3.5" />
              {risks} risk{risks > 1 ? "s" : ""}
            </span>
          )}
          <button onClick={() => onStatus(o.status === "saved" ? "new" : "saved")} className={`${btn} ${o.status === "saved" ? "bg-lime text-night ring-lime" : "text-fg/70 ring-white/10 hover:bg-white/[0.05] hover:text-fg"}`}>
            {o.status === "saved" ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            {o.status === "saved" ? "Saved" : "Save"}
          </button>
          <button onClick={() => onStatus(o.status === "rejected" ? "new" : "rejected")} className={`${btn} text-fg/55 ring-white/10 hover:bg-white/[0.05] hover:text-fg`}>
            {o.status === "rejected" ? <RotateCcw className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {o.status === "rejected" ? "Restore" : "Not for me"}
          </button>
        </div>
      </div>
    </li>
  );
}
