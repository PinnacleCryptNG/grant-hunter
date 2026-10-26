"use client";
import Link from "next/link";
import { ArrowRight, Bookmark, BookmarkCheck, Coins, Loader2, Radar, RotateCcw, TriangleAlert, UserRound, X } from "lucide-react";
import { hasProfileSignal } from "@/lib/profile";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDeadline, hostOf } from "@/lib/format";
import { markdownToText } from "@/lib/text";
import type { OpportunityRow, Profile, Status } from "@/lib/types";
import { Countdown } from "./Countdown";
import { ScoreBadge } from "./ScoreBadge";
import { StatusPill } from "./StatusPill";

type Filter = "all" | Status;
type Sort = "score" | "deadline";

const HUNT_STEPS = [
  "Planning searches from your profile with Nemotron Nano…",
  "Searching Superteam Earn, Devpost, Gitcoin, X and ecosystem pages with Tavily…",
  "Reading pages and extracting reward, deadline, eligibility and payout…",
  "Checking every fact against the source page…",
  "Scoring fit against your profile and memory with Nemotron Super…",
];

export function Dashboard() {
  const [items, setItems] = useState<OpportunityRow[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("score");
  const [showClosed, setShowClosed] = useState(false);
  const [hunting, setHunting] = useState(false);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tokenFactory: { configured: boolean }; tavily: { configured: boolean } } | null>(null);

  const load = useCallback(async () => {
    const [o, p] = await Promise.all([fetch("/api/opportunities").then((r) => r.json()), fetch("/api/profile").then((r) => r.json())]);
    setItems(o.opportunities);
    setProfile(p.profile);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!hunting) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, HUNT_STEPS.length - 1)), 9000);
    return () => clearInterval(t);
  }, [hunting]);

  const needsProfile = profile !== null && !hasProfileSignal(profile);

  async function hunt() {
    if (needsProfile) {
      setMessage("Fill in your profile first: add at least one skill, interest or ecosystem.");
      return;
    }
    setHunting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hunt", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hunt failed");
      const s = data.stats;
      setMessage(`Done in ${Math.round(s.ms / 1000)}s: ${s.results} pages found, ${s.extracted} checked, ${s.scored} new matches scored${s.skippedListing ? `, ${s.skippedListing} listing pages skipped` : ""}${s.skippedClosed ? `, ${s.skippedClosed} closed skipped` : ""}.`);
      await load();
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
    } finally {
      setHunting(false);
    }
  }

  async function setItemStatus(id: number, s: Status) {
    setItems((prev) => prev?.map((o) => (o.id === id ? { ...o, status: s } : o)) ?? null);
    await fetch(`/api/opportunities/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) });
  }

  const closed = (o: OpportunityRow) => o.extracted.openStatus === "closed" || (o.deadline_at !== null && new Date(o.deadline_at).getTime() < Date.now());

  const visible = useMemo(() => {
    if (!items) return [];
    const list = items.filter((o) => (filter === "all" ? o.status !== "rejected" : o.status === filter)).filter((o) => showClosed || !closed(o));
    return [...list].sort((a, b) => {
      if (sort === "deadline") {
        const da = a.deadline_at ? new Date(a.deadline_at).getTime() : Infinity;
        const db = b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity;
        return da - db || (b.score ?? 0) - (a.score ?? 0);
      }
      return (b.score ?? -1) - (a.score ?? -1) || (a.deadline_at ? new Date(a.deadline_at).getTime() : Infinity) - (b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity);
    });
  }, [items, filter, sort, showClosed]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, new: 0, saved: 0, applied: 0, rejected: 0 };
    for (const o of items ?? []) {
      c[o.status]++;
      if (o.status !== "rejected") c.all++;
    }
    return c;
  }, [items]);

  const tz = profile?.timezone ?? "UTC";
  const keysMissing = status && (!status.tokenFactory.configured || !status.tavily.configured);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl border-glow p-6 text-fg sm:p-7">
        <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-28 h-72 w-72 animate-float rounded-full bg-lime/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lime">Your hunt</p>
            <h1 className="mt-1.5 text-2xl font-semibold sm:text-3xl">{profile?.name ? `${profile.name.split(" ")[0]}, here's what fits you` : "Opportunities that fit you"}</h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/65">Grants, bounties, hackathons and contests, checked against the source and ranked by fit. Times shown in {tz}.</p>
          </div>
          <button onClick={hunt} disabled={hunting || !!keysMissing} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-lime px-5 py-3 text-sm font-semibold text-night shadow-[0_0_30px_-6px_rgba(198,244,50,0.45)] transition hover:bg-lime-soft disabled:opacity-50">
            {hunting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            {hunting ? "Hunting…" : "Hunt now"}
          </button>
        </div>
      </section>

      {keysMissing && <p className="flex items-start gap-2 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-300 ring-1 ring-amber-400/25"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />Live hunting is paused: the server is missing {!status.tokenFactory.configured ? "NEBIUS_API_KEY" : ""}{!status.tokenFactory.configured && !status.tavily.configured ? " and " : ""}{!status.tavily.configured ? "TAVILY_API_KEY" : ""}.</p>}
      {hunting && (
        <div className="rounded-xl bg-surface p-4 text-sm ring-1 ring-white/[0.08]" aria-live="polite">
          <ol className="space-y-1.5">
            {HUNT_STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-2 ${i < step ? "text-fg/40" : i === step ? "font-medium text-fg" : "text-fg/25"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${i <= step ? "bg-lime" : "bg-white/20"} ${i === step ? "animate-pulse" : ""}`} />
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
      {message && !hunting && <p className="rounded-xl bg-surface p-3 text-sm text-fg/80 ring-1 ring-white/[0.08]" aria-live="polite">{message}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="tablist">
          {(["all", "new", "saved", "applied", "rejected"] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium capitalize ${filter === f ? "bg-lime text-night" : "bg-surface text-fg/65 ring-1 ring-white/[0.08] hover:bg-white/5"}`}>
              {f} <span className="tabular-nums opacity-60">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 text-fg/65">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-lime-400" /> Show closed
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border-0 bg-surface py-1.5 pl-2 pr-7 text-sm ring-1 ring-white/[0.08]" aria-label="Sort">
            <option value="score">Best fit</option>
            <option value="deadline">Deadline soonest</option>
          </select>
        </div>
      </div>

      {items === null ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface ring-1 ring-white/[0.08]" />)}</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl bg-surface px-6 py-12 text-center ring-1 ring-white/[0.08]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-lime-400/10 text-lime">{needsProfile ? <UserRound className="h-6 w-6" /> : <Radar className="h-6 w-6" />}</span>
          <h2 className="mt-4 text-lg font-semibold">{needsProfile ? "First, tell the agent who you are" : items.length ? "Nothing in this view" : "No matches yet"}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-fg/50">
            {needsProfile
              ? "Add your skills, ecosystems and country so it knows what to look for and what you're eligible for."
              : items.length
                ? "Try another tab, or tick “Show closed”."
                : "Press Hunt now and the agent will search the web for opportunities that fit your profile."}
          </p>
          {needsProfile && (
            <Link href="/profile" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-lime-soft">
              Set up your profile <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((o) => (
            <li key={o.id} className="group relative flex flex-col rounded-2xl bg-surface p-4 ring-1 ring-white/[0.08] transition hover:shadow-md hover:ring-white/15">
              <div className="flex gap-3">
                <ScoreBadge score={o.score} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg/50">
                    <span className="font-medium capitalize text-fg/80">{o.kind}</span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{o.source || hostOf(o.url)}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <Link href={`/o/${o.id}`} className="mt-1 line-clamp-2 font-semibold leading-snug text-fg after:absolute after:inset-0">
                    {o.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-fg/65">{o.scoring?.verdict || markdownToText(o.extracted.summary)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${o.extracted.reward.value === "unknown" ? "bg-white/[0.04] text-fg/50 ring-white/[0.08]" : "bg-lime-400/10 text-lime ring-lime-400/25"}`}>
                  <Coins className="h-3 w-3" />
                  {o.extracted.reward.value === "unknown" ? "Reward unknown" : markdownToText(o.extracted.reward.value).slice(0, 48)}
                </span>
                <Countdown iso={o.deadline_at} />
                {(o.scoring?.risks?.length ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-400/10 px-2 py-0.5 font-medium text-rose-300 ring-1 ring-inset ring-rose-400/25">
                    <TriangleAlert className="h-3 w-3" />
                    {o.scoring!.risks.length} risk{o.scoring!.risks.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                <span className="truncate text-xs text-fg/50" suppressHydrationWarning>{formatDeadline(o.deadline_at, tz)}</span>
                <div className="relative z-10 flex gap-1">
                  <button onClick={() => setItemStatus(o.id, o.status === "saved" ? "new" : "saved")} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${o.status === "saved" ? "bg-lime text-night ring-lime" : "text-fg/65 ring-white/[0.08] hover:bg-white/[0.04]"}`}>
                    {o.status === "saved" ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                    {o.status === "saved" ? "Saved" : "Save"}
                  </button>
                  <button onClick={() => setItemStatus(o.id, o.status === "rejected" ? "new" : "rejected")} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-fg/65 ring-1 ring-white/[0.08] hover:bg-white/[0.04]">
                    {o.status === "rejected" ? <RotateCcw className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {o.status === "rejected" ? "Restore" : "Not for me"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
