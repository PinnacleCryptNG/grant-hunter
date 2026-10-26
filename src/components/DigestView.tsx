"use client";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { Digest } from "@/lib/digest";
import { formatDeadline } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { Countdown } from "./Countdown";
import { ScoreBadge } from "./ScoreBadge";

export function DigestView() {
  const [digest, setDigest] = useState<Digest | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load(regenerate = false) {
    setBusy(true);
    try {
      const d = await fetch(`/api/digest${regenerate ? "?regenerate=1" : ""}`).then((r) => r.json());
      setDigest(d.digest);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    fetch("/api/profile").then((r) => r.json()).then((d) => setProfile(d.profile));
  }, []);

  const tz = profile?.timezone ?? "UTC";

  function asText(d: Digest) {
    return [`${d.headline} (${d.day})`, ...d.items.map((i, n) => `${n + 1}. ${i.title} [${i.score ?? "?"}/100] - ${i.deadline ? formatDeadline(i.deadline, tz) : "deadline unknown"}\n   ${i.why}\n   Next: ${i.nextStep}`)].join("\n\n");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="relative">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300" suppressHydrationWarning><CalendarCheck className="h-3.5 w-3.5" />{digest?.day ? new Date(`${digest.day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "Today"}</p>
        <h1 className="mt-1.5 text-2xl font-semibold sm:text-3xl">{digest?.headline ?? "Today's top 5"}</h1>
        <p className="mt-1.5 text-sm text-white/65">Your five best open matches, ranked by fit, with a boost for anything closing this week. Refreshed every morning.</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => load(true)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-emerald-300 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{busy ? "Refreshing…" : "Refresh"}</button>
          {digest && (
            <button onClick={async () => { await navigator.clipboard.writeText(asText(digest)); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/5">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy as text"}
            </button>
          )}
        </div>
        </div>
      </section>

      {digest === undefined ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-ink/10" />)}</div>
      ) : digest === null ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-ink/10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CalendarCheck className="h-6 w-6" /></span>
          <h2 className="mt-4 text-lg font-semibold">Nothing to rank yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Your digest fills up once the agent has found some open opportunities.</p>
          <Link href="/dashboard" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-soft">Run a hunt <ArrowRight className="h-4 w-4" /></Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {digest.items.map((i, n) => (
            <li key={i.id}>
              <Link href={`/o/${i.id}`} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink/10 transition hover:shadow-md">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-400">#{n + 1}</span>
                  <ScoreBadge score={i.score} size={46} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold leading-snug">{i.title}</h2>
                  <div className="mt-1"><Countdown iso={i.deadline} /></div>
                  <p className="mt-2 text-sm text-slate-700">{i.why}</p>
                  <p className="mt-1 text-sm text-slate-500"><ArrowRight className="mr-1 inline h-3.5 w-3.5 text-emerald-600" /><span className="font-medium text-slate-700">Next:</span> {i.nextStep}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {digest?.model && <p className="text-center text-[11px] text-slate-400">Written by {digest.model} via Nebius Token Factory</p>}
    </div>
  );
}
