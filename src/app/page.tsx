import Link from "next/link";
import { ArrowRight, BrainCircuit, CalendarCheck, Check, FileSearch, Gauge, Globe, History, Lock, PenLine, Quote, Radar, Server, ShieldCheck, Sparkles, TriangleAlert, UserRound } from "lucide-react";
import { Logo, REPO_URL } from "@/components/Nav";

const PIPELINE = [
  { icon: Radar, title: "Search", text: "Superteam Earn, Devpost, Gitcoin, X and grant pages", tag: "Tavily" },
  { icon: FileSearch, title: "Read", text: "Reward, deadline, eligibility and payout", tag: "Nemotron Nano" },
  { icon: ShieldCheck, title: "Verify", text: "Every fact matched to a quote on the page", tag: "Evidence check" },
  { icon: Gauge, title: "Score", text: "0–100 fit, with reasons and risk flags", tag: "Nemotron Super" },
  { icon: PenLine, title: "Draft", text: "Application, pitch or X thread", tag: "Nemotron Ultra" },
];

const SOURCES = ["Superteam Earn", "Devpost", "Gitcoin", "X announcements", "Ecosystem grants", "Creator contests"];

const STEPS = [
  { icon: UserRound, title: "Tell it who you are", text: "Skills, ecosystems, portfolio, country and rates. That's what it hunts and scores against." },
  { icon: Radar, title: "It hunts every day", text: "On demand or on a daily schedule, it searches the places opportunities get posted and reads each page in full." },
  { icon: ShieldCheck, title: "It reads the fine print", text: "Reward, deadline in your timezone, eligibility and payout. Each one must quote the page, or it says “unknown”." },
  { icon: PenLine, title: "It drafts. You decide.", text: "A tailored application built from your real portfolio. You edit it, approve it and copy it. Nothing is sent for you." },
];

const TRUST = [
  { icon: Quote, title: "No invented facts", text: "If the page doesn't say it, the field says unknown. Any quote that can't be found on the page is thrown out." },
  { icon: TriangleAlert, title: "Red flags up front", text: "Your country isn't eligible, it pays in the sponsor's own token, there's an entry fee, the terms are vague, or the deadline has passed." },
  { icon: Lock, title: "Nothing goes out without you", text: "No auto-submit, ever. A draft has to be approved by you before you can even copy it." },
  { icon: History, title: "It learns your taste", text: "What you save, apply to and pass on, plus your notes on why, shapes every future score and draft." },
];

const DIGEST = ["The five best open matches, ranked by fit", "A boost for anything closing this week", "One line on why it fits and the next step to take", "Copy it as text and keep it wherever you plan your week"];

const STACK = [
  {
    icon: BrainCircuit,
    title: "NVIDIA Nemotron",
    lines: [
      ["Nano", "plans searches and reads every page"],
      ["Super", "scores fit and writes your digest"],
      ["Ultra", "reasons about fit and drafts applications"],
    ],
  },
  { icon: Server, title: "Nebius Token Factory", text: "Every model call runs through Token Factory's OpenAI-compatible API. Grant Hunter picks the newest Nemotron it serves for each job." },
  { icon: Globe, title: "Tavily", text: "Advanced search with full page content, aimed at the places opportunities actually get posted. One call finds the page and fetches the text Nemotron reads." },
];

function SectionHead({ eyebrow, title, text, dark = false, left = false }: { eyebrow: string; title: string; text?: string; dark?: boolean; left?: boolean }) {
  return (
    <div className={left ? "" : "mx-auto max-w-2xl text-center"}>
      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${dark ? "text-emerald-300" : "text-emerald-700"}`}>{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
      {text && <p className={`mt-4 leading-relaxed ${dark ? "text-white/60" : "text-ink/60"}`}>{text}</p>}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="overflow-x-clip">
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-48 -z-10 mx-auto h-[40rem] max-w-5xl bg-[radial-gradient(closest-side,rgba(16,185,129,0.16),transparent)]" />
        <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink/70 ring-1 ring-ink/10">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Personal AI agent · NVIDIA Nemotron on Nebius
            </p>
            <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.04] sm:text-6xl">
              Stop hunting for grants. <span className="text-emerald-600">Let the agent do it.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/65">
              Grant Hunter searches the web every day for grants, bounties, hackathons and creator contests. It checks the terms against the source, scores each one against your skills, and drafts your application. You review it and send it.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/profile" className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition hover:bg-ink-soft">
                Start hunting <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink ring-1 ring-ink/10 transition hover:ring-ink/25">
                Open dashboard
              </Link>
            </div>
            <p className="mt-4 text-xs text-ink/50">Free. No sign-up. Your profile is tied to this browser.</p>
          </div>

          <div className="rounded-3xl bg-ink p-5 text-white shadow-2xl shadow-ink/20 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold">What happens on every hunt</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Daily
              </span>
            </div>
            <ol className="mt-5">
              {PIPELINE.map(({ icon: Icon, title, text, tag }, i) => (
                <li key={title} className="relative flex gap-3.5 pb-4 last:pb-0">
                  {i < PIPELINE.length - 1 && <span aria-hidden className="absolute bottom-0 left-5 top-11 w-px bg-white/10" />}
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-emerald-300 ring-1 ring-white/10">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2">
                      <p className="font-display font-semibold">{title}</p>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/60">{tag}</span>
                    </div>
                    <p className="text-sm text-white/55">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2.5 text-xs text-emerald-200 ring-1 ring-emerald-400/20">
              <Lock className="h-3.5 w-3.5 shrink-0" /> Nothing is submitted. You approve and copy every draft.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-ink/5 bg-white/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-7 gap-y-2 px-4 py-6 text-sm font-medium text-ink/50">
          <span className="w-full text-center text-xs font-semibold uppercase tracking-[0.14em] text-ink/35 sm:w-auto">Hunts across</span>
          {SOURCES.map((s) => <span key={s}>{s}</span>)}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-20">
        <SectionHead eyebrow="How it works" title="From “where do I even look?” to a draft on your clipboard" />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></span>
                <span className="font-display text-sm font-semibold text-ink/25">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="trust" className="scroll-mt-14 bg-ink text-white">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <SectionHead dark eyebrow="Why you can trust it" title="Built not to waste your time" text="Most opportunity lists are stale, vague, or quietly pay in tokens you can't sell. Grant Hunter is strict about what it tells you." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {TRUST.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10">
                <Icon className="h-5 w-5 text-emerald-300" />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl items-center gap-12 px-4 py-20 lg:grid-cols-2">
        <div>
          <SectionHead left eyebrow="Daily digest" title="Every morning, five worth your time" />
          <ul className="mt-6 space-y-3 text-ink/70">
            {DIGEST.map((t) => (
              <li key={t} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />{t}</li>
            ))}
          </ul>
          <Link href="/digest" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            See today&apos;s top 5 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div aria-hidden className="rounded-3xl bg-white p-5 ring-1 ring-ink/10 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><CalendarCheck className="h-4 w-4 text-emerald-600" /> Today&apos;s top 5</div>
          <ol className="mt-4 space-y-2.5">
            {[92, 84, 77, 68, 61].map((w, i) => (
              <li key={w} className="flex items-center gap-3 rounded-xl bg-paper p-3">
                <span className="w-5 text-xs font-semibold text-ink/35">#{i + 1}</span>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ring-[3px] ${i < 2 ? "ring-emerald-400" : i < 4 ? "ring-amber-400" : "ring-ink/15"}`} />
                <span className="flex-1 space-y-1.5">
                  <span className="block h-2.5 rounded-full bg-ink/15" style={{ width: `${w}%` }} />
                  <span className="block h-2 rounded-full bg-ink/[0.07]" style={{ width: `${w - 25}%` }} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-ink/5 bg-white/60">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <SectionHead eyebrow="Under the hood" title="Nemotron does the thinking. Tavily does the searching." />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {STACK.map(({ icon: Icon, title, text, lines }) => (
              <div key={title} className="rounded-2xl bg-white p-6 ring-1 ring-ink/10">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-emerald-400"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                {text && <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{text}</p>}
                {lines && (
                  <dl className="mt-2 space-y-1.5 text-sm">
                    {lines.map(([k, v]) => (
                      <div key={k} className="flex gap-2"><dt className="w-11 shrink-0 font-semibold text-ink">{k}</dt><dd className="text-ink/60">{v}</dd></div>
                    ))}
                  </dl>
                )}
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-ink/55">
            Open source under MIT. <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline-offset-2 hover:underline">Read the code on GitHub</a>
          </p>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-ink px-6 py-16 text-center text-white">
          <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/25 blur-3xl" />
          <h2 className="relative text-3xl font-semibold leading-tight sm:text-4xl">Your next grant is already posted somewhere.</h2>
          <p className="relative mt-3 text-white/60">Tell Grant Hunter what you do. It&apos;ll go and find it.</p>
          <Link href="/profile" className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-emerald-300">
            Set up your profile <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink/5">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-ink/50 sm:flex-row">
          <Logo />
          <p className="text-center">Built for the Nebius × NVIDIA Global AI Hackathon · MIT licensed</p>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-ink">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
