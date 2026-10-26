"use client";
import Link from "next/link";
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

const sev = { high: "bg-rose-50 text-rose-800 ring-rose-200", medium: "bg-amber-50 text-amber-900 ring-amber-200", low: "bg-slate-50 text-slate-700 ring-slate-200" };

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

  if (missing) return <p className="text-sm text-slate-600">Opportunity not found. <Link className="underline" href="/">Back</Link></p>;
  if (!opp) return <div className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />;

  const x = opp.extracted;
  const tz = profile?.timezone ?? "UTC";
  const plus = opp.scoring?.reasons.filter((r) => r.type === "plus") ?? [];
  const minus = opp.scoring?.reasons.filter((r) => r.type === "minus") ?? [];

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor"><path d="M12.7 4.3a1 1 0 010 1.4L8.4 10l4.3 4.3a1 1 0 01-1.4 1.4l-5-5a1 1 0 010-1.4l5-5a1 1 0 011.4 0z" /></svg>
        All opportunities
      </Link>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex gap-4">
          <ScoreBadge score={opp.score} size={64} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500"><span className="font-medium capitalize text-slate-700">{opp.kind}</span> · {opp.source}</p>
            <h1 className="mt-1 text-xl font-semibold leading-snug tracking-tight">{opp.title}</h1>
            {x.summary && <p className="mt-2 text-sm text-slate-600">{markdownToText(x.summary)}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Countdown iso={opp.deadline_at} />
          <span className="text-xs text-slate-500" suppressHydrationWarning>{formatDeadline(opp.deadline_at, tz)}{opp.deadline_at && x.deadlineTimezone === "unstated" ? " (page gave no timezone; assumed UTC)" : ""}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["new", "saved", "applied", "rejected"] as Status[]).map((s) => (
            <button key={s} onClick={() => setStatus(s)} aria-pressed={opp.status === s} className={`rounded-xl px-3 py-2 text-sm font-medium capitalize ring-1 ${opp.status === s ? "bg-slate-900 text-white ring-slate-900" : "text-slate-700 ring-slate-200 hover:bg-slate-50"}`}>
              {s === "rejected" ? "Not for me" : s === "new" ? "New" : s}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-500">
          Note for the agent (why you like or reject this; it learns from it)
          <div className="mt-1 flex gap-2">
            <input value={feedback} onChange={(e) => setFeedback(e.target.value)} onBlur={saveFeedback} placeholder="e.g. paid in an illiquid token, too much work for the reward" className="w-full rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-900" />
          </div>
        </label>
      </section>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Why this score</h2>
              <button onClick={rescore} disabled={!!busy} className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline disabled:opacity-50">{busy === "rescore" ? "Rescoring…" : "Rescore with latest profile"}</button>
            </div>
            {opp.scoring?.verdict && <p className="mt-2 text-sm text-slate-700">{opp.scoring.verdict}</p>}
            <ul className="mt-3 space-y-1.5 text-sm">
              {plus.map((r, i) => <li key={`p${i}`} className="flex gap-2"><span className="mt-0.5 text-emerald-600">+</span><span>{r.text}</span></li>)}
              {minus.map((r, i) => <li key={`m${i}`} className="flex gap-2"><span className="mt-0.5 text-rose-600">−</span><span>{r.text}</span></li>)}
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
            <p className="mt-3 text-[11px] text-slate-400">Scored by {opp.scoring_model ?? "Nemotron"} via Nebius Token Factory</p>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Deep fit analysis</h2>
              <button onClick={analyze} disabled={!!busy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {busy === "analyze" ? "Nemotron Ultra is thinking…" : opp.analysis ? "Re-run" : "Run with Nemotron Ultra"}
              </button>
            </div>
            {opp.analysis ? (
              <div className="mt-3 space-y-3 text-sm">
                <p><span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${opp.analysis.recommendation === "apply" ? "bg-emerald-100 text-emerald-800" : opp.analysis.recommendation === "skip" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{opp.analysis.recommendation}</span>{opp.analysis.summary}</p>
                {opp.analysis.expectedValueNote && <p className="text-slate-600">{opp.analysis.expectedValueNote}{opp.analysis.effortEstimateHours ? ` (≈${opp.analysis.effortEstimateHours}h effort)` : ""}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  <List title="Strengths" items={opp.analysis.strengths} />
                  <List title="Gaps" items={opp.analysis.gaps} />
                </div>
                <List title="Verify before applying" items={opp.analysis.questionsToVerify} />
                <p className="text-[11px] text-slate-400">{opp.analysis.model}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Nemotron Ultra reasons over your profile, memory and the verified terms to recommend apply / maybe / skip and what to double-check.</p>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-semibold">Draft with Nemotron Ultra</h2>
            <p className="mt-1 text-sm text-slate-500">Uses your profile and portfolio only. Nothing is submitted: review, approve, copy and submit it yourself.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["application", "pitch", "tweet"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-lg px-2 py-1.5 text-sm font-medium capitalize ring-1 ${kind === k ? "bg-slate-900 text-white ring-slate-900" : "text-slate-700 ring-slate-200"}`}>
                  {k === "tweet" ? "X thread" : k}
                </button>
              ))}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional: what you want to build or emphasise" className="mt-2 w-full rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-900" />
            <button onClick={draft} disabled={!!busy} className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy === "draft" ? "Drafting… (Ultra takes ~30-60s)" : "Generate draft"}
            </button>
            <div className="mt-4 space-y-4">
              {drafts.map((d) => (
                <article key={d.id} className={`rounded-xl p-4 ring-1 ${d.approved ? "ring-emerald-300" : "ring-slate-200"}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span suppressHydrationWarning>{new Date(d.created_at).toLocaleString()} · {d.model}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(editing === d.id ? null : d.id)} className="rounded-md px-2 py-1 ring-1 ring-slate-200">{editing === d.id ? "Done" : "Edit"}</button>
                      <button onClick={() => updateDraft(d, { approved: !d.approved })} className={`rounded-md px-2 py-1 ring-1 ${d.approved ? "bg-emerald-600 text-white ring-emerald-600" : "ring-slate-200"}`}>{d.approved ? "Approved" : "Approve"}</button>
                      <button onClick={() => copy(d)} disabled={!d.approved} title={d.approved ? "Copy" : "Approve first"} className="rounded-md bg-slate-900 px-2 py-1 text-white disabled:opacity-40">{copied === d.id ? "Copied" : "Copy"}</button>
                    </div>
                  </div>
                  {editing === d.id ? (
                    <textarea defaultValue={d.content} rows={16} onBlur={(e) => updateDraft(d, { content: e.target.value })} className="w-full rounded-lg border-0 bg-slate-50 p-3 font-mono text-xs ring-1 ring-slate-200" />
                  ) : (
                    <div className="prose-draft text-sm text-slate-800"><ReactMarkdown>{d.content}</ReactMarkdown></div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-semibold">Verified terms</h2>
            <p className="mt-1 text-xs text-slate-500">Each value is backed by a quote found on the source page. Anything not stated is marked unknown.</p>
            <dl className="mt-3 divide-y divide-slate-100">
              {FIELDS.map(({ key, label }) => {
                const f = x[key] as Field;
                return (
                  <div key={key} className="py-2.5">
                    <dt className="text-xs font-medium text-slate-500">{label}</dt>
                    <dd className={`mt-0.5 text-sm ${f.value === "unknown" ? "italic text-slate-400" : "text-slate-900"}`}>{markdownToText(f.value)}</dd>
                    {f.evidence && <dd className="mt-1 border-l-2 border-slate-200 pl-2 text-xs text-slate-500">“{f.evidence}”</dd>}
                  </div>
                );
              })}
              <div className="py-2.5">
                <dt className="text-xs font-medium text-slate-500">Paid in sponsor token</dt>
                <dd className="mt-0.5 text-sm capitalize">{x.paidInSponsorToken}</dd>
              </div>
              {x.requiredSkills.length > 0 && (
                <div className="py-2.5">
                  <dt className="text-xs font-medium text-slate-500">Skills mentioned</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">{x.requiredSkills.map((s) => <span key={s} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs">{s}</span>)}</dd>
                </div>
              )}
            </dl>
          </section>
          <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-semibold">Sources</h2>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <a href={opp.url} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-sky-700 underline underline-offset-2">{hostOf(opp.url)}</a>
                <span className="block break-all text-xs text-slate-500">{opp.url}</span>
              </li>
              {opp.found_by_query && <li className="text-xs text-slate-500">Found by Tavily search: “{opp.found_by_query}”</li>}
              <li className="text-xs text-slate-500" suppressHydrationWarning>First seen {new Date(opp.created_at).toLocaleString()} · extracted by {opp.model}</li>
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
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <ul className="mt-1 list-disc space-y-1 pl-4">{items.map((i, n) => <li key={n}>{i}</li>)}</ul>
    </div>
  );
}
