"use client";
import Link from "next/link";
import { Activity, ArrowLeft, BrainCircuit, Check, Copy, Cpu, ExternalLink, Gauge, Globe, Loader2, PenLine, ShieldCheck, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { DRAFT_KINDS, draftKindsFor, workTypeOf, type DraftKind } from "@/lib/actions";
import type { Analysis } from "@/lib/draft";
import { formatDeadline, hostOf } from "@/lib/format";
import { markdownToText } from "@/lib/text";
import type { Extracted, Field, OpportunityRow, Profile, Status } from "@/lib/types";
import { Countdown } from "./Countdown";
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
  const openTone = { open: "text-lime", upcoming: "text-sky-300", closed: "text-fg/45", unknown: "text-fg/45" }[x.openStatus] ?? "text-fg/45";

  return (
    <div className="space-y-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-fg/50 hover:text-fg">
        <ArrowLeft className="h-4 w-4" />
        All opportunities
      </Link>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <OrgMark name={org || opp.source || hostOf(opp.url)} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <KindTag kind={opp.kind} />
            <WorkTag work={work} />
            {x.openStatus !== "unknown" && <span className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize ${openTone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{x.openStatus}</span>}
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-[1.1] sm:text-[2.6rem]">{opp.title}</h1>
          <p className="mt-2 text-sm text-fg/50">
            {org && <>by <span className="text-fg/80">{org}</span> · </>}
            <a href={opp.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-fg hover:underline">{hostOf(opp.url)}</a>
          </p>
          {x.summary && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fg/65">{markdownToText(x.summary)}</p>}
        </div>
      </header>

      {error && <p className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300 ring-1 ring-rose-400/25">{error}</p>}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:order-2 lg:self-start">
          <div className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.08]">
            <div className="flex items-center gap-4">
              <ScoreBadge score={opp.score} size={64} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">Fit score</p>
                <p className="mt-0.5 text-sm text-fg/70">{opp.score === null ? "Not scored yet" : opp.score >= 75 ? "Strong match" : opp.score >= 50 ? "Worth a look" : "Weak match"}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-4 border-t border-white/[0.06] pt-5">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">Reward</dt>
                <dd className={`mt-1 font-display text-xl font-semibold leading-snug ${reward ? "text-lime" : "text-fg/40"}`}>{reward ?? "Not stated on the page"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">Deadline</dt>
                <dd className="mt-1.5"><Countdown iso={opp.deadline_at} /></dd>
                <dd className="mt-1.5 text-xs text-fg/50" suppressHydrationWarning>{formatDeadline(opp.deadline_at, tz)}{opp.deadline_at && x.deadlineTimezone === "unstated" ? " (no timezone on the page; assumed UTC)" : ""}</dd>
              </div>
            </dl>
            <a href={opp.url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-4 py-2.5 text-sm font-semibold text-night transition hover:bg-lime-soft">
              Open on {hostOf(opp.url)} <ExternalLink className="h-4 w-4" />
            </a>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {(["saved", "applied", "rejected"] as Status[]).map((s) => (
                <button key={s} onClick={() => setStatus(opp.status === s ? "new" : s)} aria-pressed={opp.status === s} className={`rounded-full px-2 py-1.5 text-xs font-medium ring-1 transition ${opp.status === s ? "bg-white text-night ring-white" : "text-fg/70 ring-white/10 hover:bg-white/[0.05]"}`}>
                  {{ new: "New", saved: "Save", applied: "Applied", rejected: "Not for me" }[s]}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-xs text-fg/45">
              Note for the agent
              <input value={feedback} onChange={(e) => setFeedback(e.target.value)} onBlur={saveFeedback} placeholder="Why you like or skip this" className="mt-1.5 w-full rounded-lg border-0 bg-white/[0.04] px-3 py-2 text-sm text-fg ring-1 ring-white/[0.08] focus:ring-2 focus:ring-lime/60" />
            </label>
          </div>
          <div className="px-1 text-xs leading-relaxed text-fg/45">
            {opp.found_by_query && <p>{opp.found_by_query.startsWith("crawl ") ? `Found by Tavily crawl of ${hostOf(opp.found_by_query.slice(6))}` : `Found by Tavily search “${opp.found_by_query}”`}</p>}
            {opp.recheck_note && <p className="mt-1" suppressHydrationWarning>{opp.recheck_note} {opp.checked_at && `(${new Date(opp.checked_at).toLocaleDateString()})`}</p>}
            <p className="mt-1" suppressHydrationWarning>First seen {new Date(opp.created_at).toLocaleDateString()} · extracted by {opp.model?.split("/").pop()}</p>
          </div>
        </aside>

        <div className="min-w-0 space-y-12 lg:order-1">
          <Block icon={<Gauge className="h-4 w-4" />} title="Why it fits" action={<button onClick={rescore} disabled={!!busy} className="text-xs font-medium text-fg/50 underline-offset-2 hover:text-fg hover:underline disabled:opacity-50">{busy === "rescore" ? "Rescoring…" : "Rescore"}</button>}>
            {opp.scoring?.verdict && <p className="text-[15px] leading-relaxed text-fg/85">{opp.scoring.verdict}</p>}
            {(plus.length > 0 || minus.length > 0) && (
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <ReasonList title="In your favour" items={plus.map((r) => r.text)} mark="+" tone="text-lime" />
                <ReasonList title="Against" items={minus.map((r) => r.text)} mark="−" tone="text-rose-400" />
              </div>
            )}
            {risks.length > 0 && (
              <ul className="mt-6 space-y-2">
                {risks.map((r, i) => (
                  <li key={i} className={`flex gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${sev[r.severity] ?? sev.low}`}>
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span><span className="font-medium">{r.label}</span>{r.detail && <span className="block text-xs opacity-80">{r.detail}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] text-fg/35">Scored by {opp.scoring_model?.split("/").pop() ?? "Nemotron"} via Nebius Token Factory</p>
          </Block>

          <Block icon={<PenLine className="h-4 w-4" />} title="Your next move" sub={`Drafts for a ${({ build: "build", writing: "writing", video: "video", design: "design", social: "social", research: "research", other: "general" } as const)[work]} ${opp.kind === "unknown" || opp.kind === "other" ? "opportunity" : opp.kind}, written by Nemotron Ultra from your profile and portfolio. Nothing is sent: edit, approve, then copy it yourself.`}>
            <div className="flex flex-wrap gap-2" role="tablist">
              {allowed.map((k) => (
                <button key={k} role="tab" onClick={() => setKind(k)} aria-selected={active === k} className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${active === k ? "bg-lime text-night ring-lime" : "text-fg/70 ring-white/10 hover:bg-white/[0.05]"}`}>
                  {DRAFT_KINDS[k].label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-fg/50">{DRAFT_KINDS[active].hint}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional: what you want to build or emphasise" className="w-full rounded-full border-0 bg-white/[0.04] px-4 py-2.5 text-sm ring-1 ring-white/[0.08] focus:ring-2 focus:ring-lime/60" />
              <button onClick={() => draft(active)} disabled={!!busy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-lime-soft disabled:opacity-50">
                {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                {busy === "draft" ? "Writing…" : `Write ${DRAFT_KINDS[active].label.toLowerCase()}`}
              </button>
            </div>
            <div className="mt-6 space-y-4">
              {drafts.map((d) => (
                <article key={d.id} className={`rounded-2xl bg-surface p-5 ring-1 ${d.approved ? "ring-lime/40" : "ring-white/[0.08]"}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg/45">
                    <span suppressHydrationWarning>{new Date(d.created_at).toLocaleString()} · {d.model?.split("/").pop()}</span>
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

          <Block icon={<BrainCircuit className="h-4 w-4" />} title="Deep fit analysis" action={<button onClick={analyze} disabled={!!busy} className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-fg ring-1 ring-white/15 transition hover:bg-white/[0.05] disabled:opacity-50">{busy === "analyze" ? "Thinking…" : opp.analysis ? "Re-run" : "Run with Nemotron Ultra"}</button>}>
            {opp.analysis ? (
              <div className="space-y-5 text-sm">
                <p className="text-[15px] leading-relaxed text-fg/85"><span className={`mr-2 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${opp.analysis.recommendation === "apply" ? "bg-lime/15 text-lime" : opp.analysis.recommendation === "skip" ? "bg-rose-400/15 text-rose-300" : "bg-amber-400/15 text-amber-300"}`}>{opp.analysis.recommendation}</span>{opp.analysis.summary}</p>
                {opp.analysis.expectedValueNote && <p className="text-fg/60">{opp.analysis.expectedValueNote}{opp.analysis.effortEstimateHours ? ` (≈${opp.analysis.effortEstimateHours}h effort)` : ""}</p>}
                <div className="grid gap-6 sm:grid-cols-2">
                  <ReasonList title="Strengths" items={opp.analysis.strengths} mark="+" tone="text-lime" />
                  <ReasonList title="Gaps" items={opp.analysis.gaps} mark="−" tone="text-rose-400" />
                </div>
                <ReasonList title="Verify before applying" items={opp.analysis.questionsToVerify} mark="?" tone="text-amber-300" />
              </div>
            ) : (
              <p className="text-sm text-fg/50">Nemotron Ultra reasons over your profile, memory and the verified terms, then recommends apply, maybe or skip and lists what to double-check.</p>
            )}
          </Block>

          <Block icon={<ShieldCheck className="h-4 w-4" />} title="Verified terms" sub="Every value comes with a quote found on the source page. Anything the page doesn't state is marked unknown.">
            <dl className="grid gap-px overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.06] sm:grid-cols-2">
              {FIELDS.map(({ key, label }) => {
                const f = x[key] as Field;
                return (
                  <div key={key} className="bg-night p-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">{label}</dt>
                    <dd className={`mt-1.5 text-sm ${f.value === "unknown" ? "italic text-fg/35" : "text-fg"}`}>{markdownToText(f.value)}</dd>
                    {f.evidence && <dd className="mt-2 border-l-2 border-lime/30 pl-2.5 text-xs leading-relaxed text-fg/45">“{f.evidence}”</dd>}
                  </div>
                );
              })}
              <div className="bg-night p-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">Paid in sponsor token</dt>
                <dd className="mt-1.5 text-sm capitalize">{x.paidInSponsorToken}</dd>
              </div>
              {x.requiredSkills.length > 0 && (
                <div className="bg-night p-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">Skills mentioned</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">{x.requiredSkills.map((s) => <span key={s} className="rounded-full px-2.5 py-0.5 text-xs text-fg/75 ring-1 ring-white/10">{s}</span>)}</dd>
                </div>
              )}
            </dl>
          </Block>

          {trace.length > 0 && (
            <details className="group border-t border-white/[0.07] pt-6">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-lg font-semibold">
                <Activity className="h-4 w-4 text-lime" />Agent trace
                <span className="font-sans text-xs font-normal text-fg/40">{trace.length} calls · click to {"expand"}</span>
              </summary>
              <ol className="mt-5 space-y-3 border-l border-white/10 pl-4">
                {trace.map((t, i) => (
                  <li key={i} className="relative text-sm">
                    <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${t.ok ? "bg-lime" : "bg-rose-400"}`} />
                    <p className="flex items-center gap-1.5 font-medium">
                      {t.kind === "llm" ? <Cpu className="h-3.5 w-3.5 text-fg/50" /> : <Globe className="h-3.5 w-3.5 text-fg/50" />}
                      {OP_LABEL[t.op] ?? t.op}
                      {!t.ok && <span className="text-xs font-normal text-rose-300">failed</span>}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-fg/45">
                      {t.kind === "llm" ? (t.model?.split("/").pop() ?? "Nemotron") : "Tavily"}
                      {" · "}
                      {(t.ms / 1000).toFixed(1)}s
                      {t.prompt_tokens != null && ` · ${t.prompt_tokens + (t.completion_tokens ?? 0)} tokens`}
                      {t.kind === "llm" && t.detail === "schema" && " · structured output"}
                    </p>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ icon, title, sub, action, children }: { icon: React.ReactNode; title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/[0.07] pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="text-lime">{icon}</span>{title}</h2>
        {action}
      </div>
      {sub && <p className="mt-1.5 max-w-2xl text-sm text-fg/50">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ReasonList({ title, items, mark, tone }: { title: string; items: string[]; mark: string; tone: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg/40">{title}</h3>
      <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-fg/80">
        {items.map((t, n) => <li key={n} className="flex gap-2.5"><span className={`mt-px font-semibold ${tone}`}>{mark}</span><span>{t}</span></li>)}
      </ul>
    </div>
  );
}
