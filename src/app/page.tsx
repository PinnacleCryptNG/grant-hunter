import Link from "next/link";
import { ArrowRight, BadgeCheck, BrainCircuit, CalendarCheck, Clock, Coins, Crosshair, FileSearch, Globe, History, Lock, PenLine, Radar, Server, ShieldCheck, Sparkles, Trophy, TriangleAlert, UserRound, Zap } from "lucide-react";
import { HuntTerminal } from "@/components/landing/HuntTerminal";
import { Reveal, Spotlight } from "@/components/landing/Reveal";
import { Logo, REPO_URL } from "@/components/Nav";

const SOURCES = ["Superteam Earn", "Devpost", "Gitcoin", "X announcements", "Ecosystem grants", "Creator contests", "Solana", "Base", "NVIDIA", "Open-source AI"];

const BLIPS = [
  { label: "Grant", icon: Coins, pos: "left-[16%] top-[24%]", delay: "0s" },
  { label: "Bounty", icon: Zap, pos: "right-[12%] top-[34%]", delay: "0.9s" },
  { label: "Hackathon", icon: Trophy, pos: "left-[24%] bottom-[18%]", delay: "1.7s" },
  { label: "Contest", icon: Sparkles, pos: "right-[22%] bottom-[12%]", delay: "2.3s" },
];

const STEPS = [
  { icon: UserRound, title: "Tell it who you are", text: "Skills, ecosystems, portfolio, country, rates." },
  { icon: Radar, title: "It hunts daily", text: "Tavily searches where opportunities get posted." },
  { icon: ShieldCheck, title: "It checks the fine print", text: "Every fact quoted from the page, or “unknown”." },
  { icon: PenLine, title: "You approve the draft", text: "Nemotron Ultra writes it. You edit, approve, copy." },
];

const TRUST = [
  { icon: BadgeCheck, title: "No invented facts", text: "If the page doesn't say it, the field says unknown. Quotes that aren't on the page are thrown out." },
  { icon: TriangleAlert, title: "Red flags first", text: "Country not eligible, paid in the sponsor's own token, entry fees, vague terms, deadline passed." },
  { icon: Lock, title: "Nothing sent without you", text: "No auto-submit, ever. A draft has to be approved before you can even copy it." },
  { icon: History, title: "Learns your taste", text: "What you save, apply to and pass on, and why, shapes every future score." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-lime"><span className="h-px w-6 bg-lime/60" />{children}</p>;
}

function RadarVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(198,244,50,0.10),transparent_65%)]" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="absolute rounded-full ring-1 ring-lime/15" style={{ inset: `${i * 12.5}%` }} />
      ))}
      <div className="absolute inset-y-0 left-1/2 w-px bg-lime/10" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-lime/10" />
      <div className="absolute inset-0 animate-sweep rounded-full bg-[conic-gradient(from_0deg,rgba(198,244,50,0.38),rgba(198,244,50,0.06)_22%,transparent_30%)] [mask-image:radial-gradient(circle,black_68%,transparent_70%)]" />
      {BLIPS.map(({ label, icon: Icon, pos, delay }) => (
        <div key={label} className={`absolute ${pos} animate-float`} style={{ animationDelay: delay }}>
          <span className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 animate-blip rounded-full bg-lime" style={{ animationDelay: delay }} />
          <span className="relative block h-3 w-3 rounded-full bg-lime shadow-[0_0_16px_rgba(198,244,50,0.9)]" />
          <span className="absolute left-5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-night/80 px-2.5 py-1 font-mono text-[11px] text-fg/80 ring-1 ring-white/10 backdrop-blur">
            <Icon className="h-3 w-3 text-lime" /> {label}
          </span>
        </div>
      ))}
      <div className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-lime text-night shadow-[0_0_60px_rgba(198,244,50,0.55)]">
        <Crosshair className="h-7 w-7" strokeWidth={2.4} />
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="overflow-x-clip">
      <section className="relative isolate pt-28 sm:pt-32">
        <div aria-hidden className="grid-bg absolute inset-0 -z-10" />
        <div aria-hidden className="absolute -top-40 left-1/2 -z-10 h-[38rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(198,244,50,0.16),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div className="animate-rise">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] text-fg/70 ring-1 ring-white/10">
              <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-lime/70" /><span className="relative h-2 w-2 rounded-full bg-lime" /></span>
              NVIDIA Nemotron · Nebius Token Factory · Tavily
            </p>
            <h1 className="mt-6 text-[3rem] font-semibold leading-[0.98] sm:text-7xl">
              Stop scrolling <br className="hidden sm:block" />for grants.
              <span className="mt-1 block font-serif text-[3.4rem] font-normal italic leading-[1] tracking-normal sm:text-[5.2rem]"><span className="text-shine">Let them find you.</span></span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg/60">
              Grant Hunter is a personal AI agent that searches the web every day for grants, bounties, hackathons and creator contests, checks the fine print against the source, scores each one against you, and drafts the application. You just approve it.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/profile" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-lime px-6 py-3.5 text-sm font-semibold text-night shadow-[0_0_40px_-8px_rgba(198,244,50,0.7)] transition hover:bg-lime-soft">
                Start hunting <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#how" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-fg ring-1 ring-white/10 transition hover:bg-white/[0.08]">See how it works</a>
            </div>
            <p className="mt-5 font-mono text-[11px] text-fg/40">Free · no sign-up · nothing is ever submitted for you</p>
          </div>
          <div className="animate-rise [animation-delay:200ms]"><RadarVisual /></div>
        </div>

        <div className="relative border-y border-white/[0.06] bg-white/[0.02] py-5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-10">
            {[...SOURCES, ...SOURCES].map((s, i) => (
              <span key={i} className="inline-flex items-center gap-10 font-display text-lg font-medium text-fg/40">{s}<Crosshair className="h-4 w-4 text-lime/50" /></span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-[1fr_1.15fr]">
        <Reveal>
          <Eyebrow>Watch it hunt</Eyebrow>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl">An agent that does <span className="font-serif font-normal italic text-lime">the boring part.</span></h2>
          <p className="mt-5 max-w-md leading-relaxed text-fg/60">Every hunt plans searches from your profile, reads each page in full, checks every claim against the source, flags the traps and ranks what&apos;s left. Three Nemotron models, one job each.</p>
          <div className="mt-8 grid grid-cols-3 gap-3 font-mono text-[11px]">
            {[["Nano", "reads"], ["Super", "scores"], ["Ultra", "drafts"]].map(([m, j]) => (
              <div key={m} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.07]"><div className="font-display text-base font-semibold text-fg">{m}</div><div className="text-fg/45">{j}</div></div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={150}><HuntTerminal /></Reveal>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24">
        <Reveal className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl">From <span className="font-serif font-normal italic text-fg/70">“where do I even look?”</span> to a draft on your clipboard.</h2>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-6">
          <Reveal className="md:col-span-4" delay={0}>
            <Spotlight className="h-full overflow-hidden rounded-3xl bg-surface p-7 ring-1 ring-white/[0.07]">
              <FileSearch className="h-6 w-6 text-lime" />
              <h3 className="mt-5 text-2xl font-semibold">Reads the fine print, quotes its sources</h3>
              <p className="mt-2 max-w-md text-fg/55">Reward, deadline in your timezone, eligibility, countries, payout, entry fee. Each one has to be backed by a quote from the page.</p>
              <div className="mt-6 space-y-2 font-mono text-[12px]">
                {[["reward", "quote matched", true], ["deadline", "converted to your timezone", true], ["eligibility", "quote matched", true], ["payout", "not on the page → unknown", false]].map(([k, v, ok]) => (
                  <div key={k as string} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-white/[0.06]">
                    <span className="text-fg/70">{k}</span>
                    <span className={ok ? "text-lime" : "italic text-amber-300"}>{ok ? "✓ " : ""}{v}</span>
                  </div>
                ))}
              </div>
            </Spotlight>
          </Reveal>
          <Reveal className="md:col-span-2" delay={100}>
            <Spotlight className="flex h-full flex-col rounded-3xl bg-surface p-7 ring-1 ring-white/[0.07]">
              <TriangleAlert className="h-6 w-6 text-amber-300" />
              <h3 className="mt-5 text-2xl font-semibold">Flags the traps</h3>
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                {["Country not eligible", "Paid in sponsor token", "Entry fee", "Vague terms", "Deadline passed"].map((r) => (
                  <span key={r} className="rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-200 ring-1 ring-amber-400/25">{r}</span>
                ))}
              </div>
            </Spotlight>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0}>
            <Spotlight className="flex h-full flex-col rounded-3xl bg-surface p-7 ring-1 ring-white/[0.07]">
              <CalendarCheck className="h-6 w-6 text-lime" />
              <h3 className="mt-5 text-2xl font-semibold">Today&apos;s top 5</h3>
              <p className="mt-2 text-sm text-fg/55">Every morning: the best open matches, why they fit, and the next step.</p>
              <div className="mt-auto space-y-2 pt-6">
                {[92, 78, 64].map((w, i) => (
                  <div key={w} className="flex items-center gap-3"><span className="font-mono text-[11px] text-fg/40">#{i + 1}</span><span className="h-2 rounded-full bg-gradient-to-r from-lime to-lime/30" style={{ width: `${w}%` }} /></div>
                ))}
              </div>
            </Spotlight>
          </Reveal>
          <Reveal className="md:col-span-4" delay={100}>
            <Spotlight className="h-full overflow-hidden rounded-3xl bg-surface p-7 ring-1 ring-white/[0.07]">
              <PenLine className="h-6 w-6 text-fuchsia-300" />
              <h3 className="mt-5 text-2xl font-semibold">Drafts the application. Never sends it.</h3>
              <p className="mt-2 max-w-md text-fg/55">Nemotron Ultra writes an application, pitch or X thread from your real portfolio only. You edit it, approve it, copy it.</p>
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                <div className="flex-1 space-y-2">{[90, 75, 82].map((w) => <div key={w} className="h-2 rounded-full bg-white/10" style={{ width: `${w}%` }} />)}</div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-xs font-semibold text-night"><BadgeCheck className="h-3.5 w-3.5" /> Approve</span>
              </div>
            </Spotlight>
          </Reveal>
        </div>

        <ol className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 90}>
              <li className="relative">
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/10 text-lime ring-1 ring-lime/25"><Icon className="h-5 w-5" /></span><span className="h-px flex-1 bg-gradient-to-r from-lime/40 to-transparent" /></div>
                <p className="mt-4 font-mono text-[11px] text-fg/35">0{i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-fg/55">{text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section id="trust" className="relative scroll-mt-24 border-y border-white/[0.06] bg-surface/60">
        <div aria-hidden className="grid-bg absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center"><Eyebrow>Why you can trust it</Eyebrow></div>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl">Built not to <span className="font-serif font-normal italic text-lime">waste your time.</span></h2>
            <p className="mt-5 text-fg/55">Most opportunity lists are stale, vague, or quietly pay in tokens you can&apos;t sell. Grant Hunter is strict about what it tells you.</p>
          </Reveal>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 90}>
                <Spotlight className="h-full rounded-3xl bg-night/70 p-6 ring-1 ring-white/[0.08] transition hover:-translate-y-1">
                  <Icon className="h-6 w-6 text-lime" />
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg/55">{text}</p>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24">
        <Reveal className="max-w-2xl">
          <Eyebrow>Under the hood</Eyebrow>
          <h2 className="mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl">Nemotron thinks. <span className="font-serif font-normal italic text-fg/70">Tavily searches.</span></h2>
        </Reveal>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {[
            { icon: BrainCircuit, title: "NVIDIA Nemotron", text: "Nano plans searches and reads pages. Super scores fit and writes your digest. Ultra reasons about fit and drafts applications." },
            { icon: Server, title: "Nebius Token Factory", text: "Every model call runs through Token Factory's OpenAI-compatible API, using the newest Nemotron it serves for each job." },
            { icon: Globe, title: "Tavily", text: "Advanced search with full page content, aimed at where opportunities get posted. One call finds the page and fetches the text." },
          ].map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 90}>
              <Spotlight className="h-full rounded-3xl bg-surface p-7 ring-1 ring-white/[0.07]">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.05] text-lime ring-1 ring-white/10"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg/55">{text}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-4 pb-24">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border-glow px-6 py-20 text-center">
            <div aria-hidden className="grid-bg absolute inset-0" />
            <div aria-hidden className="absolute -bottom-48 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-lime/25 blur-3xl" />
            <Clock className="relative mx-auto h-7 w-7 text-lime" />
            <h2 className="relative mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">Your next grant is <span className="font-serif font-normal italic text-shine">already posted.</span></h2>
            <p className="relative mt-4 text-fg/60">Tell Grant Hunter what you do. It&apos;ll go and find it.</p>
            <Link href="/profile" className="group relative mt-9 inline-flex items-center gap-2 rounded-xl bg-lime px-6 py-3.5 text-sm font-semibold text-night shadow-[0_0_50px_-6px_rgba(198,244,50,0.8)] transition hover:bg-lime-soft">
              Set up your profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-fg/45 sm:flex-row">
          <Logo />
          <p className="text-center font-mono text-[11px]">Built for the Nebius × NVIDIA Global AI Hackathon · MIT</p>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-fg">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
