"use client";
import Link from "next/link";
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
      <section className="rounded-2xl bg-slate-900 p-5 text-white">
        <p className="text-sm text-slate-300" suppressHydrationWarning>{digest?.day ? new Date(`${digest.day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "Today"}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{digest?.headline ?? "Today's top 5"}</h1>
        <p className="mt-2 text-sm text-slate-300">Ranked by fit with a boost for deadlines this week. Refreshed daily by the scheduled hunt.</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => load(true)} disabled={busy} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60">{busy ? "Refreshing…" : "Refresh digest"}</button>
          {digest && (
            <button onClick={async () => { await navigator.clipboard.writeText(asText(digest)); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-xl px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/30">
              {copied ? "Copied" : "Copy as text"}
            </button>
          )}
        </div>
      </section>

      {digest === undefined ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />)}</div>
      ) : digest === null ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">No open opportunities yet. <Link href="/" className="underline">Run a hunt</Link> first.</p>
      ) : (
        <ol className="space-y-3">
          {digest.items.map((i, n) => (
            <li key={i.id}>
              <Link href={`/o/${i.id}`} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:shadow-md">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-400">#{n + 1}</span>
                  <ScoreBadge score={i.score} size={46} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold leading-snug">{i.title}</h2>
                  <div className="mt-1"><Countdown iso={i.deadline} /></div>
                  <p className="mt-2 text-sm text-slate-700">{i.why}</p>
                  <p className="mt-1 text-sm text-slate-500"><span className="font-medium text-slate-700">Next step:</span> {i.nextStep}</p>
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
