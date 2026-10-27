"use client";
import Link from "next/link";
import { Activity, ArrowLeft, AtSign, BrainCircuit, Check, ChevronDown, Clapperboard, ClipboardList, Copy, Cpu, ExternalLink, FileText, Globe, Hammer, ListTree, Loader2, Megaphone, Palette, PenLine, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { DRAFT_KINDS, draftKindsFor, workTypeOf, type DraftKind } from "@/lib/actions";
import type { Analysis } from "@/lib/draft";
import { formatDeadline, hostOf, timeLeft } from "@/lib/format";
import { markdownToText } from "@/lib/text";
import type { Extracted, Field, OpportunityRow, Profile, Status } from "@/lib/types";
import { KindTag, OrgMark, WorkTag } from "./kindMeta";
import { ScoreBadge } from "./ScoreBadge";

type TraceStep = { kind: "llm" | "tavily"; op: string; model: string | null; prompt_tokens: number | null; completion_tokens: number | null; ms: number; ok: boolean; detail: string | null; created_at: string };

const OP_LABEL: Record<string, string> = {
  extract: "Read the page and extracted the terms",
  score: "Scored fit against your profile",
  analyze: "Deep fit analysis",
  draft: "Wrote a draft",
  digest: "Ranked for the daily digest",
  search: "Tavily search",
  crawl: "Tavily crawl",
  embed: "Compared with your past decisions (embeddings)",
};

type Draft = { id: number; content: string; model: string | null; approved: boolean; created_at: string };
type Detail = OpportunityRow & { analysis: (Analysis & { model: string; createdAt: string }) | null };

const FIELDS: { key: keyof Extracted; label: string }[] = [
  { key: "reward", label: "Reward" },
  { key: "deadline", label: "Deadline (as stated)" },
  { key: "eligibility", label: "Eligibility" },
  { key: "eligibleCountries", label: "Countries" },
  { key: "payoutMethod", label: "Payout method" },
  { key: "entryFee", label: "Entry fee" },
  { key: "organizer", label: "Organizer" },
  { key: "howToApply", label: "How to apply" },
];

const sev = { high: "bg-rose-400/[0.07] text-rose-200 ring-rose-400/20", medium: "bg-amber-400/[0.07] text-amber-200 ring-amber-400/20", low: "bg-white/[0.03] text-fg/80 ring-white/[0.08]" };

export function OpportunityDetail({ id }: { id: number }) {
  const [opp, setOpp] = useState<Detail | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<DraftKind | null>(null);
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/opportunities/${id}`);
    if (res.status === 404) return setMissing(true);
    const data = await res.json();
    setOpp(data.opportunity);
    setDrafts(data.drafts);
    setTrace(data.trace ?? []);
    setFeedback(data.opportunity.feedback ?? "");
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/profile").then((r) => r.json()).then((d) => setProfile(d.profile));
  }, [load]);

  async function call(label: string, url: string, init?: RequestInit) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${label} failed`);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(status: Status) {
    if (!opp) return;
    setOpp({ ...opp, status });
    await fetch(`/api/opportunities/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, feedback: feedback || undefined }) });
  }

  async function saveFeedback() {
    await fetch(`/api/opportunities/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback }) });
  }

  async function draft(k: DraftKind) {
    const data = await call("draft", `/api/opportunities/${id}/draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: k, notes }) });
    if (data) setDrafts((d) => [data.draft, ...d]);
  }

  async function analyze() {
    const data = await call("analyze", `/api/opportunities/${id}/analyze`, { method: "POST" });
    if (data && opp) setOpp({ ...opp, analysis: data.analysis });
  }

  async function rescore() {
    const data = await call("rescore", `/api/opportunities/${id}/rescore`, { method: "POST" });
    if (data && opp) setOpp({ ...opp, scoring: data.scoring, score: data.scoring.score });
  }

  async function updateDraft(d: Draft, patch: Partial<Pick<Draft, "content" | "approved">>) {
    const res = await fetch(`/api/opportunities/${id}/draft`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: d.id, ...patch }) });
    const data = await res.json();
    if (res.ok) setDrafts((all) => all.map((x) => (x.id === d.id ? data.draft : x)));
  }

  async function copy(d: Draft) {
    await navigator.clipboard.writeText(d.content);
    setCopied(d.id);
    setTimeout(() => setCopied(null), 1500);
  }

  if (missing) return <p className="text-sm text-fg/65">Opportunity not found. <Link className="underline" href="/dashboard">Back</Link></p>;
  if (!opp) return <div className="h-64 animate-pulse rounded-2xl bg-surface ring-1 ring-white/[0.08]" />;

  const x = opp.extracted;
  const tz = profile?.timezone ?? "UTC";
  const plus = opp.scoring?.reasons.filter((r) => r.type === "plus") ?? [];
  const minus = opp.scoring?.reasons.filter((r) => r.type === "minus") ?? [];

  const work = workTypeOf(x, opp.kind, opp.title);
  const allowed = draftKindsFor(opp.kind, work);
  const active: DraftKind = kind && allowed.includes(kind) ? kind : allowed[0]!;
  const org = x.organizer.value !== "unknown" ? markdownToText(x.organizer.value) : "";
  const reward = x.reward.value !== "unknown" ? markdownToText(x.reward.value) : null;
  const risks = opp.scoring?.risks ?? [];
  const known = FIELDS.filter((f) => f.key !== "reward" && (x[f.key] as Field).value !== "unknown");
  const unknown = FIELDS.filter((f) => (x[f.key] as Field).value === "unknown").map((f) => f.label.toLowerCase());
  const left = timeLeft(opp.deadline_at, Date.now());
  const days = Math.floor(left.ms / 86400000);
  const openLabel = { open: "Open", upcoming: "Opens soon", closed: "Closed", unknown: "Status unknown" }[x.openStatus] ?? "Status unknown";

  return (
    <div className="space-y-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-fg/50 hover:text-fg">
        <ArrowLeft className="h-4 w-4" />
        All opportunities
      </Link>

      <header className="relative overflow-hidden rounded-[2rem] bg-surface p-6 ring-1 ring-white/[0.08] sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lime/[0.07] blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-3">
          <OrgMark name={org || opp.source || hostOf(opp.url)} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg/85">{org || hostOf(opp.url)}</p>
            <a href={opp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-fg/40 hover:text-fg">{hostOf(opp.url)}</a>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <span className="rounded-full bg-white/[0.05] px-3 py-1 ring-1 ring-white/[0.08]"><KindTag kind={opp.kind} /></span>
            <span className="rounded-full bg-white/[0.05] px-3 py-1 ring-1 ring-white/[0.08]"><WorkTag work={work} /></span>
          </div>
        </div>
        <h1 className="relative mt-6 max-w-3xl text-3xl font-semibold leading-[1.1] sm:text-[2.75rem]">{opp.title}</h1>

        <dl className="relative mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.06] md:grid-cols-4">
          <Stat label="Reward"><span title={reward ?? undefined} className={`font-display text-xl font-semibold ${reward ? "text-lime" : "text-fg/40"}`}>{reward ?? "Not stated"}</span></Stat>
          <Stat label="Time left">
            <span suppressHydrationWarning title={formatDeadline(opp.deadline_at, tz)} className="font-display text-xl font-semibold tabular-nums">{left.urgency === "unknown" ? "No deadline" : left.urgency !== "closed" && days >= 1 ? `${days} day${days > 1 ? "s" : ""}` : left.label}</span>
            {opp.deadline_at && <span suppressHydrationWarning className="mt-0.5 block text-xs text-fg/40">{formatDeadline(opp.deadline_at, tz).split(",").slice(0, 2).join(",")}</span>}
          </Stat>
          <Stat label="Your fit">
            <span className="flex items-center gap-2.5"><ScoreBadge score={opp.score} size={36} /><span className="text-sm text-fg/70">{opp.score === null ? "Not scored" : opp.score >= 75 ? "Strong match" : opp.score >= 50 ? "Worth a look" : "Weak match"}</span></span>
          </Stat>
          <Stat label="Status"><span className={`inline-flex items-center gap-2 font-display text-xl font-semibold ${x.openStatus === "open" ? "text-lime" : "text-fg/70"}`}><span className="h-2 w-2 rounded-full bg-current" />{openLabel}</span></Stat>
        </dl>

        <div className="relative mt-6 flex flex-wrap items-center gap-2">
          <a href={opp.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-lime-soft">
            View on {hostOf(opp.url)} <ExternalLink className="h-4 w-4" />
          </a>
          {(["saved", "applied", "rejected"] as Status[]).map((s) => (
            <button key={s} onClick={() => setStatus(opp.status === s ? "new" : s)} aria-pressed={opp.status === s} className={`rounded-full px-4 py-2.5 text-sm font-medium ring-1 transition ${opp.status === s ? "bg-white text-night ring-white" : "text-fg/75 ring-white/10 hover:bg-white/[0.05]"}`}>
              {{ new: "New", saved: opp.status === "saved" ? "Saved" : "Save", applied: "Applied", rejected: "Not for me" }[s]}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300 ring-1 ring-rose-400/25">{error}</p>}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-14">
          {x.summary && (
            <Block title="About">
              <p className="max-w-2xl text-[15px] leading-7 text-fg/75">{markdownToText(x.summary)}</p>
            </Block>
          )}

          <Block title="Why it fits you" action={<button onClick={rescore} disabled={!!busy} className="text-xs font-medium text-fg/45 hover:text-fg disabled:opacity-50">{busy === "rescore" ? "Rescoring…" : "Rescore"}</button>}>
            {opp.scoring?.verdict && <p className="max-w-2xl font-display text-xl leading-snug text-fg">{opp.scoring.verdict}</p>}
            {(plus.length > 0 || minus.length > 0) && (
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <ReasonList title="For you" items={plus.map((r) => r.text)} mark="+" tone="text-lime" />
                <ReasonList title="Against you" items={minus.map((r) => r.text)} mark="−" tone="text-rose-400" />
              </div>
            )}
            {risks.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {risks.map((r, i) => (
                  <span key={i} title={r.detail} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${sev[r.severity] ?? sev.low}`}>
                    <TriangleAlert className="h-3.5 w-3.5" />{r.label}
                  </span>
                ))}
              </div>
            )}
          </Block>

          <Block title="Your next move">
            <div className="grid gap-3 sm:grid-cols-2">
              {allowed.map((k) => {
                const Icon = DRAFT_ICONS[k];
                return (
                  <button key={k} onClick={() => setKind(k)} aria-pressed={active === k} className={`flex gap-3 rounded-2xl p-4 text-left ring-1 transition ${active === k ? "bg-lime/[0.08] ring-lime/50" : "bg-surface/60 ring-white/[0.07] hover:ring-white/15"}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active === k ? "bg-lime text-night" : "bg-white/[0.06] text-fg/70"}`}><Icon className="h-4 w-4" /></span>
                    <span>
                      <span className="block text-sm font-semibold">{DRAFT_KINDS[k].label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-fg/50">{DRAFT_KINDS[k].hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to focus on? (optional)" className="w-full rounded-full border-0 bg-white/[0.04] px-4 py-2.5 text-sm ring-1 ring-white/[0.08] focus:ring-2 focus:ring-lime/60" />
              <button onClick={() => draft(active)} disabled={!!busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-lime-soft disabled:opacity-50">
                {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy === "draft" ? "Writing…" : `Write ${DRAFT_KINDS[active].label.toLowerCase()}`}
              </button>
            </div>
            <p className="mt-2.5 text-xs text-fg/35">Written by Nemotron Ultra from your profile. Nothing is sent for you.</p>
            <div className="mt-6 space-y-4">
              {drafts.map((d) => (
                <article key={d.id} className={`rounded-2xl bg-surface p-5 ring-1 sm:p-6 ${d.approved ? "ring-lime/40" : "ring-white/[0.08]"}`}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-fg/45">
                    <span suppressHydrationWarning>{new Date(d.created_at).toLocaleString()}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditing(editing === d.id ? null : d.id)} className="rounded-full px-3 py-1 ring-1 ring-white/10 hover:bg-white/[0.05]">{editing === d.id ? "Done" : "Edit"}</button>
                      <button onClick={() => updateDraft(d, { approved: !d.approved })} className={`rounded-full px-3 py-1 ring-1 ${d.approved ? "bg-lime text-night ring-lime" : "ring-white/10 hover:bg-white/[0.05]"}`}>{d.approved ? "Approved" : "Approve"}</button>
                      <button onClick={() => copy(d)} disabled={!d.approved} title={d.approved ? "Copy" : "Approve first"} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-medium text-night disabled:opacity-30">{copied === d.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied === d.id ? "Copied" : "Copy"}</button>
                    </div>
                  </div>
                  {editing === d.id ? (
                    <textarea defaultValue={d.content} rows={16} onBlur={(e) => updateDraft(d, { content: e.target.value })} className="w-full rounded-lg border-0 bg-white/[0.04] p-3 font-mono text-xs ring-1 ring-white/[0.08]" />
                  ) : (
                    <div className="prose-draft text-sm leading-relaxed text-fg"><ReactMarkdown>{d.content}</ReactMarkdown></div>
                  )}
                </article>
              ))}
            </div>
          </Block>

          <Block title="Second opinion" action={<button onClick={analyze} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-white/15 transition hover:bg-white/[0.05] disabled:opacity-50">{busy === "analyze" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}{busy === "analyze" ? "Thinking…" : opp.analysis ? "Run again" : "Ask Nemotron Ultra"}</button>}>
            {opp.analysis ? (
              <div className="space-y-6 text-sm">
                <div className="flex flex-wrap items-start gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${opp.analysis.recommendation === "apply" ? "bg-lime text-night" : opp.analysis.recommendation === "skip" ? "bg-rose-400/20 text-rose-200" : "bg-amber-400/20 text-amber-200"}`}>{opp.analysis.recommendation}</span>
                  <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-fg/85">{opp.analysis.summary}</p>
                </div>
                {opp.analysis.expectedValueNote && <p className="text-fg/55">{opp.analysis.expectedValueNote}{opp.analysis.effortEstimateHours ? ` About ${opp.analysis.effortEstimateHours}h of work.` : ""}</p>}
                <div className="grid gap-6 sm:grid-cols-2">
                  <ReasonList title="Strengths" items={opp.analysis.strengths} mark="+" tone="text-lime" />
                  <ReasonList title="Gaps" items={opp.analysis.gaps} mark="−" tone="text-rose-400" />
                </div>
                <ReasonList title="Check before you start" items={opp.analysis.questionsToVerify} mark="?" tone="text-amber-300" />
              </div>
            ) : (
              <p className="text-sm text-fg/50">Apply, maybe or skip, with the gaps to close first.</p>
            )}
          </Block>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          <section>
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg/45"><ShieldCheck className="h-3.5 w-3.5 text-lime" />Key terms</h2>
            <dl className="mt-4 divide-y divide-white/[0.06] rounded-2xl bg-surface/60 px-4 ring-1 ring-white/[0.07]">
              {known.map(({ key, label }) => {
                const f = x[key] as Field;
                return (
                  <div key={key} className="py-3.5">
                    <dt className="text-xs text-fg/40">{label}</dt>
                    <dd className="mt-1 text-sm leading-snug text-fg/90">{markdownToText(f.value)}</dd>
                    {f.evidence && <dd className="mt-1.5 line-clamp-2 text-[11px] italic leading-relaxed text-fg/35" title={f.evidence}>“{f.evidence}”</dd>}
                  </div>
                );
              })}
              {x.requiredSkills.length > 0 && (
                <div className="py-3.5">
                  <dt className="text-xs text-fg/40">Skills</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">{x.requiredSkills.map((s) => <span key={s} className="rounded-full px-2.5 py-0.5 text-xs text-fg/75 ring-1 ring-white/10">{s}</span>)}</dd>
                </div>
              )}
            </dl>
            {unknown.length > 0 && <p className="mt-3 px-1 text-xs leading-relaxed text-fg/35">Not on the page, so left unknown: {unknown.join(", ")}.</p>}
          </section>

          <section>
            <label className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg/45" htmlFor="agent-note">Note for the agent</label>
            <input id="agent-note" value={feedback} onChange={(e) => setFeedback(e.target.value)} onBlur={saveFeedback} placeholder="Why you like or skip this" className="mt-3 w-full rounded-xl border-0 bg-white/[0.04] px-3 py-2.5 text-sm ring-1 ring-white/[0.08] focus:ring-2 focus:ring-lime/60" />
          </section>

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg/45 hover:text-fg">
              <Activity className="h-3.5 w-3.5 text-lime" />How the agent found this
              <ChevronDown className="ml-auto h-3.5 w-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-1 text-xs leading-relaxed text-fg/45">
              {opp.found_by_query && <p>{opp.found_by_query.startsWith("crawl ") ? `Tavily crawl of ${hostOf(opp.found_by_query.slice(6))}` : opp.found_by_query.startsWith("via ") ? `Followed from a listing on ${hostOf(opp.found_by_query.slice(4))}` : `Tavily search “${opp.found_by_query}”`}</p>}
              {opp.recheck_note && <p suppressHydrationWarning>{opp.recheck_note} {opp.checked_at && `(${new Date(opp.checked_at).toLocaleDateString()})`}</p>}
              <p suppressHydrationWarning>First seen {new Date(opp.created_at).toLocaleDateString()}</p>
            </div>
            {trace.length > 0 && (
              <ol className="mt-4 space-y-3 border-l border-white/10 pl-4">
                {trace.map((t, i) => (
                  <li key={i} className="relative text-xs">
                    <span className={`absolute -left-[20.5px] top-1 h-2 w-2 rounded-full ${t.ok ? "bg-lime" : "bg-rose-400"}`} />
                    <p className="flex items-center gap-1.5 font-medium text-fg/80">
                      {t.kind === "llm" ? <Cpu className="h-3 w-3 text-fg/45" /> : <Globe className="h-3 w-3 text-fg/45" />}
                      {OP_LABEL[t.op] ?? t.op}
                      {!t.ok && <span className="font-normal text-rose-300">failed</span>}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-fg/40">
                      {t.kind === "llm" ? (t.model?.split("/").pop() ?? "Nemotron") : "Tavily"} · {(t.ms / 1000).toFixed(1)}s
                      {t.prompt_tokens != null && ` · ${t.prompt_tokens + (t.completion_tokens ?? 0)} tok`}
                      {t.kind === "llm" && t.detail === "schema" && " · structured"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </details>
        </aside>
      </div>
    </div>
  );
}

const DRAFT_ICONS: Record<DraftKind, typeof PenLine> = { application: FileText, pitch: Megaphone, tweet: AtSign, plan: Hammer, writeup: ClipboardList, article: PenLine, outline: ListTree, script: Clapperboard, brief: Palette };

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-night/80 p-4 sm:p-5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/40">{label}</dt>
      <dd className="mt-2 min-w-0 truncate">{children}</dd>
    </div>
  );
}

function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ReasonList({ title, items, mark, tone }: { title: string; items: string[]; mark: string; tone: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/40">{title}</h3>
      <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-fg/80">
        {items.map((t, n) => <li key={n} className="flex gap-2.5"><span className={`font-semibold ${tone}`}>{mark}</span><span>{t}</span></li>)}
      </ul>
    </div>
  );
}
