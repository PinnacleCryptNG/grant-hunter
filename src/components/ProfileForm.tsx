"use client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";

const input = "w-full rounded-lg border-0 bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 focus:ring-2 focus:ring-slate-900";

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setDraft("");
  };
  return (
    <div className="rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-slate-900">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-sm ring-1 ring-slate-200">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="text-slate-400 hover:text-slate-900">×</button>
          </span>
        ))}
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={add} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} placeholder={placeholder} className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none" />
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{text}</span>
      {children}
    </label>
  );
}

const ZONES = typeof Intl !== "undefined" && "supportedValuesOf" in Intl ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone") : ["UTC"];

export function ProfileForm() {
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<{ saved: number; applied: number; rejected: number } | null>(null);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => setP(d.profile));
    fetch("/api/opportunities").then((r) => r.json()).then((d) => {
      const c = { saved: 0, applied: 0, rejected: 0 };
      for (const o of d.opportunities as { status: keyof typeof c }[]) if (o.status in c) c[o.status]++;
      setHistory(c);
    });
  }, []);

  if (!p) return <div className="h-96 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => { setP({ ...p, [k]: v }); setSaved(false); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    const d = await res.json();
    setP(d.profile);
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-1 text-sm text-slate-500">The agent hunts, scores and drafts from this. Add at least one skill, interest or ecosystem before hunting. It is stored on the server and tied to this browser.</p>
        </div>
      </div>

      <Section title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Name"><input className={input} value={p.name} onChange={(e) => set("name", e.target.value)} /></Label>
          <Label text="Headline"><input className={input} value={p.headline} onChange={(e) => set("headline", e.target.value)} /></Label>
        </div>
        <Label text="Bio"><textarea className={input} rows={4} value={p.bio} onChange={(e) => set("bio", e.target.value)} /></Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Country (used for eligibility checks)"><input className={input} value={p.country} onChange={(e) => set("country", e.target.value)} /></Label>
          <Label text="Timezone (deadlines are converted to this)">
            <select className={input} value={p.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {(ZONES.includes(p.timezone) ? ZONES : [p.timezone, ...ZONES]).map((z) => <option key={z}>{z}</option>)}
            </select>
          </Label>
        </div>
      </Section>

      <Section title="Skills & focus" hint="Press Enter or comma to add.">
        <Label text="Skills"><TagInput value={p.skills} onChange={(v) => set("skills", v)} placeholder="Rust, design, video…" /></Label>
        <Label text="Ecosystems"><TagInput value={p.ecosystems} onChange={(v) => set("ecosystems", v)} placeholder="Solana, Ethereum, NVIDIA…" /></Label>
        <Label text="Interests"><TagInput value={p.interests} onChange={(v) => set("interests", v)} placeholder="AI agents, DeFi, education…" /></Label>
      </Section>

      <Section title="Rates & preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Hourly rate (USD)"><input type="number" min={0} className={input} value={p.hourlyRateUsd ?? ""} onChange={(e) => set("hourlyRateUsd", e.target.value === "" ? null : Number(e.target.value))} /></Label>
          <Label text="Minimum reward worth chasing (USD)"><input type="number" min={0} className={input} value={p.minRewardUsd ?? ""} onChange={(e) => set("minRewardUsd", e.target.value === "" ? null : Number(e.target.value))} /></Label>
        </div>
        <Label text="Preferred payout"><TagInput value={p.preferredPayout} onChange={(v) => set("preferredPayout", v)} placeholder="USDC, bank transfer…" /></Label>
        <Label text="Avoid"><TagInput value={p.avoid} onChange={(v) => set("avoid", v)} placeholder="Entry fees, NFT-only prizes…" /></Label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-slate-900" checked={p.huntSchedule === "daily"} onChange={(e) => set("huntSchedule", e.target.checked ? "daily" : "off")} />
          Hunt automatically every day and refresh my digest
        </label>
      </Section>

      <Section title="Links">
        {p.links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input className={`${input} w-28 shrink-0`} placeholder="Label" value={l.label} onChange={(e) => set("links", p.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <input className={input} placeholder="https://" value={l.url} onChange={(e) => set("links", p.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <button type="button" aria-label="Remove link" onClick={() => set("links", p.links.filter((_, j) => j !== i))} className="px-2 text-slate-400 hover:text-slate-900">×</button>
          </div>
        ))}
        <button type="button" onClick={() => set("links", [...p.links, { label: "", url: "" }])} className="text-sm font-medium text-slate-700 underline underline-offset-2">Add link</button>
      </Section>

      <Section title="Portfolio" hint="Drafts cite only these projects, never invented ones.">
        {p.portfolio.map((it, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-slate-50/60 p-3 ring-1 ring-slate-200">
            <div className="flex gap-2">
              <input className={input} placeholder="Project" value={it.title} onChange={(e) => set("portfolio", p.portfolio.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <button type="button" aria-label="Remove project" onClick={() => set("portfolio", p.portfolio.filter((_, j) => j !== i))} className="px-2 text-slate-400 hover:text-slate-900">×</button>
            </div>
            <input className={input} placeholder="https://" value={it.url} onChange={(e) => set("portfolio", p.portfolio.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <textarea className={input} rows={2} placeholder="What it is, your role, results" value={it.description} onChange={(e) => set("portfolio", p.portfolio.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
          </div>
        ))}
        <button type="button" onClick={() => set("portfolio", [...p.portfolio, { title: "", url: "", description: "" }])} className="text-sm font-medium text-slate-700 underline underline-offset-2">Add project</button>
      </Section>

      {history && (
        <Section title="What the agent remembers" hint="Saved, applied and rejected opportunities (with your notes) are fed into every score and draft.">
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["saved", "applied", "rejected"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xl font-semibold tabular-nums">{history[k]}</div>
                <div className="text-xs capitalize text-slate-500">{k}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="sticky bottom-20 z-10 sm:bottom-4">
        <button disabled={saving} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60">
          {saving ? "Saving…" : saved ? "Saved" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
