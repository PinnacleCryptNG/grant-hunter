"use client";
import { useEffect, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { AVOID, ECOSYSTEMS, INTERESTS, PAYOUTS, SKILL_GROUPS, countryNames } from "@/lib/options";
import type { Profile } from "@/lib/types";
import { AccountPanel } from "./AccountPanel";

const input = "w-full rounded-lg border-0 bg-white/[0.04] px-3 py-2 text-sm text-fg ring-1 ring-white/[0.08] focus:ring-2 focus:ring-lime/60";

function ChipPicker({ value, onChange, options, placeholder = "Add your own…" }: { value: string[]; onChange: (v: string[]) => void; options: string[] | Record<string, string[]>; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const groups = Array.isArray(options) ? { "": options } : options;
  const known = new Set(Object.values(groups).flat().map((o) => o.toLowerCase()));
  const custom = value.filter((v) => !known.has(v.toLowerCase()));
  const has = (o: string) => value.some((v) => v.toLowerCase() === o.toLowerCase());
  const toggle = (o: string) => onChange(has(o) ? value.filter((v) => v.toLowerCase() !== o.toLowerCase()) : [...value, o]);
  const add = () => {
    const parts = draft.split(",").map((t) => t.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((t) => !has(t))]);
    setDraft("");
  };
  const chip = (o: string, on: boolean) => (
    <button key={o} type="button" aria-pressed={on} onClick={() => toggle(o)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 transition ${on ? "bg-lime text-night ring-lime" : "text-fg/65 ring-white/10 hover:bg-white/[0.05] hover:text-fg"}`}>
      {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 opacity-50" />}
      {o}
    </button>
  );
  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([g, opts]) => (
        <div key={g}>
          {g && <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg/35">{g}</p>}
          <div className="flex flex-wrap gap-1.5">{opts.map((o) => chip(o, has(o)))}</div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        {custom.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-lime px-3 py-1.5 text-[13px] font-medium text-night">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={add} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} placeholder={placeholder} className="min-w-[10rem] flex-1 rounded-full border-0 bg-transparent px-3 py-1.5 text-[13px] ring-1 ring-dashed ring-white/10 outline-none placeholder:text-fg/35 focus:ring-lime/50" />
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.08]">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-fg/50">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-fg/65">{text}</span>
      {children}
    </label>
  );
}

function Picker({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-xs font-medium text-fg/65">{text}</span>
      {children}
    </div>
  );
}

const ZONES = typeof Intl !== "undefined" && "supportedValuesOf" in Intl ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone") : ["UTC"];

export function ProfileForm() {
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<{ saved: number; applied: number; rejected: number } | null>(null);

  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    setCountries(countryNames());
    fetch("/api/profile").then((r) => r.json()).then((d) => {
      const prof = d.profile as Profile;
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setP(prof.timezone === "UTC" && local ? { ...prof, timezone: local } : prof);
    });
    fetch("/api/opportunities").then((r) => r.json()).then((d) => {
      const c = { saved: 0, applied: 0, rejected: 0 };
      for (const o of d.opportunities as { status: keyof typeof c }[]) if (o.status in c) c[o.status]++;
      setHistory(c);
    });
  }, []);

  if (!p) return <div className="h-96 animate-pulse rounded-2xl bg-surface ring-1 ring-white/[0.08]" />;
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lime">Profile</p>
          <h1 className="mt-1.5 text-2xl font-semibold sm:text-3xl">Tell the agent who you are</h1>
          <p className="mt-1.5 text-sm text-fg/50">Everything it hunts, scores and writes comes from this, so the more specific you are, the better the matches. Add at least one skill, interest or ecosystem to start. Saved to this browser, or to your GitHub account if you sign in.</p>
        </div>
      </div>

      <AccountPanel />

      <Section title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Name"><input className={input} value={p.name} onChange={(e) => set("name", e.target.value)} /></Label>
          <Label text="Headline"><input className={input} value={p.headline} onChange={(e) => set("headline", e.target.value)} /></Label>
        </div>
        <Label text="Bio"><textarea className={input} rows={4} value={p.bio} onChange={(e) => set("bio", e.target.value)} /></Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Country (used for eligibility checks)"><select className={input} value={p.country} onChange={(e) => set("country", e.target.value)}>
              <option value="">Select your country</option>
              {(p.country && !countries.includes(p.country) ? [p.country, ...countries] : countries).map((c) => <option key={c}>{c}</option>)}
            </select></Label>
          <Label text="Timezone (deadlines are converted to this)">
            <select className={input} value={p.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {(ZONES.includes(p.timezone) ? ZONES : [p.timezone, ...ZONES]).map((z) => <option key={z}>{z}</option>)}
            </select>
          </Label>
        </div>
      </Section>

      <Section title="Skills & focus" hint="Tap everything that applies. Missing something? Type it in.">
        <Picker text="Skills"><ChipPicker value={p.skills} onChange={(v) => set("skills", v)} options={SKILL_GROUPS} /></Picker>
        <Picker text="Ecosystems"><ChipPicker value={p.ecosystems} onChange={(v) => set("ecosystems", v)} options={ECOSYSTEMS} /></Picker>
        <Picker text="Interests"><ChipPicker value={p.interests} onChange={(v) => set("interests", v)} options={INTERESTS} /></Picker>
      </Section>

      <Section title="Rates & preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Hourly rate (USD)"><input type="number" min={0} className={input} value={p.hourlyRateUsd ?? ""} onChange={(e) => set("hourlyRateUsd", e.target.value === "" ? null : Number(e.target.value))} /></Label>
          <Label text="Minimum reward worth chasing (USD)"><input type="number" min={0} className={input} value={p.minRewardUsd ?? ""} onChange={(e) => set("minRewardUsd", e.target.value === "" ? null : Number(e.target.value))} /></Label>
        </div>
        <Picker text="Preferred payout"><ChipPicker value={p.preferredPayout} onChange={(v) => set("preferredPayout", v)} options={PAYOUTS} /></Picker>
        <Picker text="Avoid"><ChipPicker value={p.avoid} onChange={(v) => set("avoid", v)} options={AVOID} /></Picker>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-lime-400" checked={p.huntSchedule === "daily"} onChange={(e) => set("huntSchedule", e.target.checked ? "daily" : "off")} />
          Hunt automatically every day and refresh my digest
        </label>
      </Section>

      <Section title="Links">
        {p.links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input className={`${input} w-28 shrink-0`} placeholder="Label" value={l.label} onChange={(e) => set("links", p.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <input className={input} placeholder="https://" value={l.url} onChange={(e) => set("links", p.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <button type="button" aria-label="Remove link" onClick={() => set("links", p.links.filter((_, j) => j !== i))} className="px-2 text-fg/40 hover:text-fg"><X className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => set("links", [...p.links, { label: "", url: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-lime hover:text-lime"><Plus className="h-4 w-4" />Add link</button>
      </Section>

      <Section title="Portfolio" hint="Drafts cite only these projects, never invented ones.">
        {p.portfolio.map((it, i) => (
          <div key={i} className="space-y-2 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.08]">
            <div className="flex gap-2">
              <input className={input} placeholder="Project" value={it.title} onChange={(e) => set("portfolio", p.portfolio.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <button type="button" aria-label="Remove project" onClick={() => set("portfolio", p.portfolio.filter((_, j) => j !== i))} className="px-2 text-fg/40 hover:text-fg"><X className="h-4 w-4" /></button>
            </div>
            <input className={input} placeholder="https://" value={it.url} onChange={(e) => set("portfolio", p.portfolio.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <textarea className={input} rows={2} placeholder="What it is, your role, results" value={it.description} onChange={(e) => set("portfolio", p.portfolio.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
          </div>
        ))}
        <button type="button" onClick={() => set("portfolio", [...p.portfolio, { title: "", url: "", description: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-lime hover:text-lime"><Plus className="h-4 w-4" />Add project</button>
      </Section>

      {history && (
        <Section title="What the agent remembers" hint="Saved, applied and rejected opportunities (with your notes) are fed into every score and draft.">
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["saved", "applied", "rejected"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.08]">
                <div className="text-xl font-semibold tabular-nums">{history[k]}</div>
                <div className="text-xs capitalize text-fg/50">{k}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="sticky bottom-20 z-10 sm:bottom-4">
        <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-night shadow-[0_0_30px_-6px_rgba(198,244,50,0.45)] transition hover:bg-lime-soft disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4 text-lime" /> : null}
          {saving ? "Saving…" : saved ? "Saved" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
