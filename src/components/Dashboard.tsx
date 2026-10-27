"use client";
import Link from "next/link";
import { ArrowRight, Loader2, Radar, TriangleAlert, UserRound } from "lucide-react";
import { hasProfileSignal } from "@/lib/profile";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OpportunityRow, Profile, Status } from "@/lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { Radar as RadarScope } from "./landing/Radar";

type Filter = "all" | Status;
type Sort = "score" | "deadline";

const HUNT_STEPS = [
  "Planning searches from your profile with Nemotron Nano…",
  "Searching Superteam Earn, Devpost, Gitcoin, X and ecosystem pages with Tavily…",
  "Reading pages in full with Tavily…",
  "Extracting reward, deadline, eligibility and payout, and checking every fact against the page…",
  "Scoring fit against your profile and memory with Nemotron Super…",
];
const STAGES = ["planning", "searching", "reading", "verifying", "scoring"];

type HuntProgress = { stage: string; results?: number; newPages?: number; extracted?: number; scored?: number; toScore?: number };
type HuntState = { id: number; status: "running" | "done" | "failed"; progress: HuntProgress | null; stats: { ms: number; results: number; extracted: number; scored: number; skippedListing: number; skippedClosed: number } | null; error: string | null };

function stepDetail(i: number, p: HuntProgress | null) {
  if (!p) return null;
  if (i === 1 && p.results) return `${p.results} pages found`;
  if (i === 3 && p.newPages) return `${p.extracted ?? 0}/${p.newPages} checked`;
  if (i === 4 && p.toScore) return `${p.scored ?? 0}/${p.toScore} scored`;
  return null;
}

export function Dashboard() {
  const [items, setItems] = useState<OpportunityRow[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("score");
  const [showClosed, setShowClosed] = useState(false);
  const [hunting, setHunting] = useState(false);
  const [progress, setProgress] = useState<HuntProgress | null>(null);
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

  const step = Math.max(0, STAGES.indexOf(progress?.stage ?? "planning"));

  const follow = useCallback(
    async (huntId: number) => {
      setHunting(true);
      setMessage(null);
      try {
        for (;;) {
          const { hunt: h } = (await fetch(`/api/hunt?id=${huntId}`).then((r) => r.json())) as { hunt: HuntState | null };
          if (!h) throw new Error("Hunt not found");
          setProgress(h.progress);
          if (h.status === "failed") throw new Error(h.error || "Hunt failed");
          if (h.status === "done" && h.stats) {
            const s = h.stats;
            setMessage(`Done in ${Math.round(s.ms / 1000)}s: ${s.results} pages found, ${s.extracted} checked, ${s.scored} new matches scored${s.skippedListing ? `, ${s.skippedListing} listing pages skipped` : ""}${s.skippedClosed ? `, ${s.skippedClosed} closed skipped` : ""}.`);
            break;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
        await load();
      } catch (e) {
        setMessage(String(e instanceof Error ? e.message : e));
      } finally {
        setHunting(false);
        setProgress(null);
      }
    },
    [load],
  );

  // Pick up a hunt that is still running, e.g. after a page refresh.
  useEffect(() => {
    fetch("/api/hunt")
      .then((r) => r.json())
      .then((d: { hunt: HuntState | null }) => {
        if (d.hunt?.status === "running") follow(d.hunt.id);
      })
      .catch(() => {});
  }, [follow]);

  const needsProfile = profile !== null && !hasProfileSignal(profile);

  async function hunt() {
    if (needsProfile) {
      setMessage("Fill in your profile first: add at least one skill, interest or ecosystem.");
      return;
    }
    setMessage(null);
    try {
      const res = await fetch("/api/hunt", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hunt failed");
      await follow(data.huntId);
    } catch (e) {
      setMessage(String(e instanceof Error ? e.message : e));
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
      <section className="relative grid items-center gap-6 border-b border-white/10 pb-8 pt-2 sm:grid-cols-[1fr_auto] sm:gap-10">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-fg/45">
            <span className={`h-1.5 w-1.5 rounded-full bg-lime ${hunting ? "animate-ping" : ""}`} />
            {hunting ? "Hunting now" : "Your hunt"}
          </p>
          <h1 className="mt-4 text-[2.4rem] font-semibold leading-[1] sm:text-5xl">
            {profile?.name ? `${profile.name.split(" ")[0]},` : "Opportunities"}{" "}
            <span className="font-serif font-normal italic text-lime">{profile?.name ? "here's what fits you." : "that fit you."}</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-fg/50">Grants, bounties, hackathons and contests, checked against the source and ranked by fit. Times shown in {tz}.</p>
          <button onClick={hunt} disabled={hunting || !!keysMissing} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-lime py-3 pl-5 pr-6 text-sm font-semibold text-night transition hover:bg-lime-soft disabled:opacity-50">
            {hunting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            {hunting ? "Hunting…" : "Hunt now"}
          </button>
        </div>
        <div aria-hidden className="hidden w-52 sm:block lg:w-60">
          <RadarScope labels={false} speed={hunting ? 3.5 : 0.7} />
        </div>
      </section>

      {keysMissing && <p className="flex items-start gap-2 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-300 ring-1 ring-amber-400/25"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />Live hunting is paused: the server is missing {!status.tokenFactory.configured ? "NEBIUS_API_KEY" : ""}{!status.tokenFactory.configured && !status.tavily.configured ? " and " : ""}{!status.tavily.configured ? "TAVILY_API_KEY" : ""}.</p>}
      {hunting && (
        <div className="border-l border-lime/40 py-1 pl-4 text-sm" aria-live="polite">
          <ol className="space-y-1.5">
            {HUNT_STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-2 ${i < step ? "text-fg/40" : i === step ? "font-medium text-fg" : "text-fg/25"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${i <= step ? "bg-lime" : "bg-white/20"} ${i === step ? "animate-pulse" : ""}`} />
                {s}
                {stepDetail(i, progress) && i <= step && <span className="font-mono text-[11px] text-lime/80">{stepDetail(i, progress)}</span>}
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
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface ring-1 ring-white/[0.08]" />)}</div>
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
        <ul className="space-y-4">
          {visible.map((o) => <OpportunityCard key={o.id} o={o} tz={tz} onStatus={(st) => setItemStatus(o.id, st)} />)}
        </ul>
      )}
    </div>
  );
}
