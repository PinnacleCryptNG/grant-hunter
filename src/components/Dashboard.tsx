"use client";
import Link from "next/link";
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
  "Planning searches with Nemotron Nano…",
  "Searching Superteam Earn, Devpost, Gitcoin, X and ecosystem pages with Tavily…",
  "Reading pages and extracting reward, deadline, eligibility and payout…",
  "Verifying every field against the source text…",
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

  async function hunt() {
    setHunting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/hunt", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hunt failed");
      const s = data.stats;
      setMessage(`Hunt done in ${Math.round(s.ms / 1000)}s: ${s.results} pages found, ${s.extracted} verified, ${s.scored} new matches scored${s.skippedListing ? `, ${s.skippedListing} listing pages skipped` : ""}${s.skippedClosed ? `, ${s.skippedClosed} closed skipped` : ""}.`);
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
      <section className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{profile?.name ? `Opportunities for ${profile.name.split(" ")[0]}` : "Your opportunities"}</h1>
          <p className="mt-1 text-sm text-slate-300">Grants, bounties, hackathons and contests, verified and scored against your profile. Times shown in {tz}.</p>
        </div>
        <button onClick={hunt} disabled={hunting || !!keysMissing} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:opacity-60">
          {hunting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" /> : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" /></svg>}
          {hunting ? "Hunting…" : "Hunt now"}
        </button>
      </section>

      {keysMissing && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">Live hunting is disabled: the server is missing {!status.tokenFactory.configured ? "NEBIUS_API_KEY" : ""}{!status.tokenFactory.configured && !status.tavily.configured ? " and " : ""}{!status.tavily.configured ? "TAVILY_API_KEY" : ""}.</p>}
      {hunting && (
        <div className="rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200" aria-live="polite">
          <ol className="space-y-1.5">
            {HUNT_STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-2 ${i < step ? "text-slate-400" : i === step ? "font-medium text-slate-900" : "text-slate-300"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${i <= step ? "bg-slate-900" : "bg-slate-300"} ${i === step ? "animate-pulse" : ""}`} />
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
      {message && !hunting && <p className="rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200" aria-live="polite">{message}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1" role="tablist">
          {(["all", "new", "saved", "applied", "rejected"] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium capitalize ${filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
              {f} <span className="tabular-nums opacity-60">{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 text-slate-600">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="accent-slate-900" /> Show closed
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border-0 bg-white py-1.5 pl-2 pr-7 text-sm ring-1 ring-slate-200" aria-label="Sort">
            <option value="score">Best fit</option>
            <option value="deadline">Deadline soonest</option>
          </select>
        </div>
      </div>

      {items === null ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />)}</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">Nothing here yet. Press <strong>Hunt now</strong> to search the web for opportunities that fit your profile.</div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((o) => (
            <li key={o.id} className="group relative flex flex-col rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300">
              <div className="flex gap-3">
                <ScoreBadge score={o.score} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="font-medium capitalize text-slate-700">{o.kind}</span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{o.source || hostOf(o.url)}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <Link href={`/o/${o.id}`} className="mt-1 line-clamp-2 font-semibold leading-snug text-slate-900 after:absolute after:inset-0">
                    {o.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{o.scoring?.verdict || markdownToText(o.extracted.summary)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${o.extracted.reward.value === "unknown" ? "bg-slate-50 text-slate-500 ring-slate-200" : "bg-slate-900 text-white ring-slate-900"}`}>
                  {o.extracted.reward.value === "unknown" ? "Reward unknown" : markdownToText(o.extracted.reward.value).slice(0, 48)}
                </span>
                <Countdown iso={o.deadline_at} />
                {(o.scoring?.risks?.length ?? 0) > 0 && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                    {o.scoring!.risks.length} risk{o.scoring!.risks.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <span className="truncate text-xs text-slate-500" suppressHydrationWarning>{formatDeadline(o.deadline_at, tz)}</span>
                <div className="relative z-10 flex gap-1">
                  <button onClick={() => setItemStatus(o.id, o.status === "saved" ? "new" : "saved")} className={`rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ${o.status === "saved" ? "bg-violet-600 text-white ring-violet-600" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
                    {o.status === "saved" ? "Saved" : "Save"}
                  </button>
                  <button onClick={() => setItemStatus(o.id, o.status === "rejected" ? "new" : "rejected")} className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
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
