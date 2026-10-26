"use client";
import Link from "next/link";
import { ArrowLeft, BrainCircuit, Check, Copy, ExternalLink, Gauge, Link2, Loader2, PenLine, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Analysis } from "@/lib/draft";
import { formatDeadline, hostOf } from "@/lib/format";
import { markdownToText } from "@/lib/text";
import type { Extracted, Field, OpportunityRow, Profile, Status } from "@/lib/types";
import { Countdown } from "./Countdown";
import { ScoreBadge } from "./ScoreBadge";

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

const sev = { high: "bg-rose-400/10 text-rose-300 ring-rose-400/25", medium: "bg-amber-400/10 text-amber-300 ring-amber-400/25", low: "bg-white/[0.04] text-fg/80 ring-white/[0.08]" };

export function OpportunityDetail({ id }: { id: number }) {
  const [opp, setOpp] = useState<Detail | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"application" | "pitch" | "tweet">("application");
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

  async function draft() {
    const data = await call("draft", `/api/opportunities/${id}/draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, notes }) });
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

  return (
    <div className="space-y-5">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-fg/50 hover:text-fg">
        <ArrowLeft className="h-4 w-4" />
        All opportunities
      </Link>

      <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.08]">
        <div className="flex gap-4">
          <ScoreBadge score={opp.score} size={64} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-fg/50"><span className="font-medium capitalize text-fg/80">{opp.kind}</span> · {opp.source}</p>
            <h1 className="mt-1 text-xl font-semibold leading-snug sm:text-2xl">{opp.title}</h1>
            {x.summary && <p className="mt-2 text-sm text-fg/65">{markdownToText(x.summary)}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Countdown iso={opp.deadline_at} />
          <span className="text-xs text-fg/50" suppressHydrationWarning>{formatDeadline(opp.deadline_at, tz)}{opp.deadline_at && x.deadlineTimezone === "unstated" ? " (page gave no timezone; assumed UTC)" : ""}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["new", "saved", "applied", "rejected"] as Status[]).map((s) => (
            <button key={s} onClick={() => setStatus(s)} aria-pressed={opp.status === s} className={`rounded-xl px-3 py-2 text-sm font-medium ring-1 ${opp.status === s ? "bg-lime text-night ring-lime" : "text-fg/80 ring-white/[0.08] hover:bg-white/[0.04]"}`}>
              {{ new: "New", saved: "Saved", applied: "Applied", rejected: "Not for me" }[s]}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-medium text-fg/50">
          Note for the agent (why you like or reject this; it learns from it)
          <div className="mt-1 flex gap-2">
            <input value={feedback} onChange={(e) => setFeedback(e.target.value)} onBlur={saveFeedback} placeholder="e.g. paid in an illiquid token, too much work for the reward" className="w-full rounded-lg border-0 bg-white/[0.04] px-3 py-2 text-sm text-fg ring-1 ring-white/[0.08] focus:ring-2 focus:ring-lime/60" />
          </div>
        </label>
      </section>

      {error && <p className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300 ring-1 ring-rose-400/25">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.08]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold"><Gauge className="h-4 w-4 text-lime" />Why this score</h2>
              <button onClick={rescore} disabled={!!busy} className="text-xs font-medium text-fg/50 underline-offset-2 hover:underline disabled:opacity-50">{busy === "rescore" ? "Rescoring…" : "Rescore with latest profile"}</button>
            </div>
            {opp.scoring?.verdict && <p className="mt-2 text-sm text-fg/80">{opp.scoring.verdict}</p>}
            <ul className="mt-3 space-y-1.5 text-sm">
              {plus.map((r, i) => <li key={`p${i}`} className="flex gap-2"><span className="mt-0.5 text-lime">+</span><span>{r.text}</span></li>)}
              {minus.map((r, i) => <li key={`m${i}`} className="flex gap-2"><span className="mt-0.5 text-rose-400">−</span><span>{r.text}</span></li>)}
            </ul>
            {(opp.scoring?.risks.length ?? 0) > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold">Risks</h3>
                <ul className="mt-2 space-y-2">
                  {opp.scoring!.risks.map((r, i) => (
                    <li key={i} className={`rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${sev[r.severity] ?? sev.low}`}>
                      <span className="font-medium">{r.label}</span>
                      {r.detail && <span className="block text-xs opacity-80">{r.detail}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-3 text-[11px] text-fg/40">Scored by {opp.scoring_model ?? "Nemotron"} via Nebius Token Factory</p>
          </section>

          <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.08]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold"><BrainCircuit className="h-4 w-4 text-lime" />Deep fit analysis</h2>
              <button onClick={analyze} disabled={!!busy} className="rounded-lg bg-lime px-3 py-1.5 text-xs font-semibold text-night disabled:opacity-50">
                {busy === "analyze" ? "Nemotron Ultra is thinking…" : opp.analysis ? "Re-run" : "Run with Nemotron Ultra"}
              </button>
            </div>
            {opp.analysis ? (
              <div className="mt-3 space-y-3 text-sm">
                <p><span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${opp.analysis.recommendation === "apply" ? "bg-lime-400/15 text-lime" : opp.analysis.recommendation === "skip" ? "bg-rose-400/15 text-rose-300" : "bg-amber-400/15 text-amber-300"}`}>{opp.analysis.recommendation}</span>{opp.analysis.summary}</p>
                {opp.analysis.expectedValueNote && <p className="text-fg/65">{opp.analysis.expectedValueNote}{opp.analysis.effortEstimateHours ? ` (≈${opp.analysis.effortEstimateHours}h effort)` : ""}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  <List title="Strengths" items={opp.analysis.strengths} />
                  <List title="Gaps" items={opp.analysis.gaps} />
                </div>
                <List title="Verify before applying" items={opp.analysis.questionsToVerify} />
                <p className="text-[11px] text-fg/40">{opp.analysis.model}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-fg/50">Nemotron Ultra reasons over your profile, memory and the verified terms to recommend apply / maybe / skip and what to double-check.</p>
            )}
          </section>

          <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.08]">
            <h2 className="flex items-center gap-2 font-semibold"><PenLine className="h-4 w-4 text-lime" />Draft with Nemotron Ultra</h2>
            <p className="mt-1 text-sm text-fg/50">Written from your profile and portfolio only. Nothing is sent: edit it, approve it, then copy it and submit it yourself.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["application", "pitch", "tweet"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-lg px-2 py-1.5 text-sm font-medium capitalize ring-1 ${kind === k ? "bg-lime text-night ring-lime" : "text-fg/80 ring-white/[0.08]"}`}>
                  {k === "tweet" ? "X thread" : k}
                </button>
              ))}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional: what you want to build or emphasise" className="mt-2 w-full rounded-lg border-0 bg-white/[0.04] px-3 py-2 text-sm ring-1 ring-white/[0.08] focus:ring-2 focus:ring-lime/60" />
            <button onClick={draft} disabled={!!busy} className="mt-2 w-full rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-night disabled:opacity-50">
              {busy === "draft" ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : <PenLine className="mr-1.5 inline h-4 w-4" />}{busy === "draft" ? "Nemotron Ultra is writing…" : "Write a draft"}
            </button>
            <div className="mt-4 space-y-4">
              {drafts.map((d) => (
                <article key={d.id} className={`rounded-xl p-4 ring-1 ${d.approved ? "ring-lime-400/40" : "ring-white/[0.08]"}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-fg/50">
                    <span suppressHydrationWarning>{new Date(d.created_at).toLocaleString()} · {d.model}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(editing === d.id ? null : d.id)} className="rounded-md px-2 py-1 ring-1 ring-white/[0.08]">{editing === d.id ? "Done" : "Edit"}</button>
                      <button onClick={() => updateDraft(d, { approved: !d.approved })} className={`rounded-md px-2 py-1 ring-1 ${d.approved ? "bg-lime text-night ring-lime" : "ring-white/[0.08]"}`}>{d.approved ? "Approved" : "Approve"}</button>
                      <button onClick={() => copy(d)} disabled={!d.approved} title={d.approved ? "Copy" : "Approve first"} className="inline-flex items-center gap-1 rounded-md bg-lime px-2 py-1 text-night disabled:opacity-40">{copied === d.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied === d.id ? "Copied" : "Copy"}</button>
                    </div>
                  </div>
                  {editing === d.id ? (
                    <textarea defaultValue={d.content} rows={16} onBlur={(e) => updateDraft(d, { content: e.target.value })} className="w-full rounded-lg border-0 bg-white/[0.04] p-3 font-mono text-xs ring-1 ring-white/[0.08]" />
                  ) : (
                    <div className="prose-draft text-sm text-fg"><ReactMarkdown>{d.content}</ReactMarkdown></div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.08]">
            <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-lime" />Verified terms</h2>
            <p className="mt-1 text-xs text-fg/50">Every value comes with a quote found on the source page. Anything the page doesn&apos;t state is marked unknown.</p>
            <dl className="mt-3 divide-y divide-white/[0.06]">
              {FIELDS.map(({ key, label }) => {
                const f = x[key] as Field;
                return (
                  <div key={key} className="py-2.5">
                    <dt className="text-xs font-medium text-fg/50">{label}</dt>
                    <dd className={`mt-0.5 text-sm ${f.value === "unknown" ? "italic text-fg/40" : "text-fg"}`}>{markdownToText(f.value)}</dd>
                    {f.evidence && <dd className="mt-1 border-l-2 border-white/[0.06] pl-2 text-xs text-fg/50">“{f.evidence}”</dd>}
                  </div>
                );
              })}
              <div className="py-2.5">
                <dt className="text-xs font-medium text-fg/50">Paid in sponsor token</dt>
                <dd className="mt-0.5 text-sm capitalize">{x.paidInSponsorToken}</dd>
              </div>
              {x.requiredSkills.length > 0 && (
                <div className="py-2.5">
                  <dt className="text-xs font-medium text-fg/50">Skills mentioned</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">{x.requiredSkills.map((s) => <span key={s} className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-xs">{s}</span>)}</dd>
                </div>
              )}
            </dl>
          </section>
          <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.08]">
            <h2 className="flex items-center gap-2 font-semibold"><Link2 className="h-4 w-4 text-lime" />Sources</h2>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <a href={opp.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-medium text-lime underline underline-offset-2">{hostOf(opp.url)}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a>
                <span className="block break-all text-xs text-fg/50">{opp.url}</span>
              </li>
              {opp.found_by_query && <li className="text-xs text-fg/50">Found by Tavily search: “{opp.found_by_query}”</li>}
              <li className="text-xs text-fg/50" suppressHydrationWarning>First seen {new Date(opp.created_at).toLocaleString()} · extracted by {opp.model}</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fg/50">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-4">{items.map((i, n) => <li key={n}>{i}</li>)}</ul>
    </div>
  );
}
