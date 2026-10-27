import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Radar, RadarReadout } from "@/components/landing/Radar";
import { Reveal, ScrollWords } from "@/components/landing/Reveal";
import { Logo, REPO_URL } from "@/components/Nav";

const SOURCES = ["Superteam Earn", "Devpost", "Gitcoin", "X announcements", "Ecosystem grants", "Creator contests", "Solana", "Base", "Open-source AI"];

const STEPS = [
  { title: "Tell it who you are", text: "Skills, ecosystems, portfolio, country and rates. It also remembers what you save, apply to and pass on." },
  { title: "It hunts every day", text: "Tavily searches Superteam Earn, Devpost, Gitcoin, X and ecosystem grant pages, and reads every page in full." },
  { title: "It reads the fine print", text: "Nemotron pulls out reward, deadline, eligibility and payout. Each fact needs a quote from the page, or it's marked unknown." },
  { title: "You approve the draft", text: "Nemotron Ultra writes the application from your real portfolio. Nothing is sent. You edit it, approve it and copy it." },
];

const STACK = [
  { name: "NVIDIA Nemotron", role: "Nano reads · Super scores · Ultra drafts", text: "Three model sizes, each matched to the job: fast ones for parsing pages and scoring fit, the largest for reasoning and writing." },
  { name: "Nebius Token Factory", role: "Every model call", text: "All Nemotron calls run through Token Factory's OpenAI-compatible API, using the newest model it serves for each tier." },
  { name: "Tavily", role: "Search + extract", text: "Advanced search aimed at where opportunities are posted, returning full page text so one call finds the page and reads it." },
];

function Label({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-fg/40">
      <span className="text-lime">({n})</span>&nbsp;&nbsp;{children}
    </p>
  );
}

export default function Landing() {
  return (
    <div className="overflow-x-clip">
      <section className="relative isolate pt-28 sm:pt-32">
        <div aria-hidden className="absolute right-[-20%] top-0 -z-10 h-[52rem] w-[52rem] rounded-full bg-[radial-gradient(closest-side,rgba(12,17,27,0.09),transparent)] lg:right-[-8%]" />
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 lg:grid-cols-[1fr_1.1fr] lg:gap-0">
          <div className="animate-rise">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-fg/45">A personal AI agent for builders</p>
            <h1 className="mt-6 text-[3.1rem] font-semibold leading-[0.95] sm:text-[4.6rem]">
              Stop scrolling
              <br />
              for grants.
              <span className="mt-2 block font-serif text-[3.6rem] font-normal italic leading-[0.95] tracking-[-0.01em] text-lime sm:text-[5.4rem]">Let them find you.</span>
            </h1>
            <p className="mt-7 max-w-md text-[1.05rem] leading-relaxed text-fg/55">
              Grant Hunter searches the web every day for grants, bounties, hackathons and contests that fit you, checks each one against its source, and drafts the application for you to approve.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/profile" className="group inline-flex items-center gap-2.5 rounded-full bg-lime py-3.5 pl-6 pr-5 text-sm font-semibold text-night transition hover:bg-lime-soft">
                Start hunting <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#how" className="group inline-flex items-center gap-1.5 text-sm font-medium text-fg/70 transition hover:text-fg">
                <span className="border-b border-fg/25 pb-0.5 transition group-hover:border-lime">How it works</span>
              </a>
            </div>
          </div>
          <div className="animate-rise [animation-delay:200ms]">
            <Radar className="mx-auto max-w-[40rem] lg:-mr-10" />
            <div className="-mt-4 sm:-mt-6"><RadarReadout /></div>
          </div>
        </div>

        <div className="mt-20 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)] sm:mt-24">
          <div className="flex w-max animate-marquee items-baseline gap-12 py-2">
            {[...SOURCES, ...SOURCES].map((s, i) => (
              <span key={i} className={i % 2 ? "font-serif text-4xl italic text-fg/30 sm:text-6xl" : "font-display text-4xl font-semibold tracking-tight text-fg/[0.13] sm:text-6xl"}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-32 sm:pt-40">
        <Reveal className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Label n="01">How it works</Label>
          <h2 className="text-4xl font-semibold leading-[1.02] sm:text-6xl">
            Four steps. <span className="font-serif font-normal italic text-fg/50">Then it runs on its own.</span>
          </h2>
        </Reveal>
        <ol className="mt-16 sm:mt-20">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <li className="group relative grid gap-3 border-t border-white/10 py-9 sm:grid-cols-[7rem_1fr_1.25fr] sm:items-baseline sm:gap-8 sm:py-11">
                <span aria-hidden className="absolute inset-x-0 -top-px h-px origin-left scale-x-0 bg-lime transition-transform duration-700 ease-out group-hover:scale-x-100" />
                <span className="font-serif text-5xl italic text-fg/20 transition-colors duration-500 group-hover:text-lime sm:text-6xl">0{i + 1}</span>
                <h3 className="text-2xl font-semibold sm:text-3xl">{s.title}</h3>
                <p className="max-w-md leading-relaxed text-fg/50">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section id="trust" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-32 sm:pt-44">
        <Reveal><Label n="02">Ground rules</Label></Reveal>
        <ScrollWords
          className="mt-10 text-[2rem] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[3.4rem]"
          text="If a page doesn't say it, Grant Hunter says *unknown.* It warns you about *country* *limits,* *sponsor* *tokens,* *entry* *fees* and *vague* *terms* before you spend an evening on them. And it *never* *submits* *anything* for you."
        />
      </section>

      <section id="stack" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-32 sm:pt-44">
        <Reveal className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Label n="03">Under the hood</Label>
          <h2 className="text-4xl font-semibold leading-[1.02] sm:text-6xl">
            Nemotron thinks. <span className="font-serif font-normal italic text-fg/50">Tavily searches.</span>
          </h2>
        </Reveal>
        <div className="mt-16 grid border-t border-white/10 sm:mt-20 lg:grid-cols-3">
          {STACK.map((s, i) => (
            <Reveal key={s.name} delay={i * 100} className={`py-9 lg:px-8 lg:py-10 ${i ? "border-t border-white/10 lg:border-l lg:border-t-0" : "lg:pl-0"}`}>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-lime/80">{s.role}</p>
              <h3 className="mt-4 text-2xl font-semibold">{s.name}</h3>
              <p className="mt-3 leading-relaxed text-fg/50">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative isolate mt-24 overflow-hidden px-4 py-32 sm:mt-32 sm:py-44">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[44rem] max-w-[140vw] -translate-x-1/2 -translate-y-1/2 opacity-40 [mask-image:radial-gradient(circle,black_30%,transparent_70%)]">
          <Radar labels={false} core={false} speed={0.6} />
        </div>
        <Reveal className="mx-auto max-w-4xl text-center">
          <h2 className="text-5xl font-semibold leading-[0.98] sm:text-[5.5rem]">
            Your next grant is <span className="font-serif font-normal italic text-lime">already posted.</span>
          </h2>
          <p className="mt-6 text-lg text-fg/55">Tell Grant Hunter what you do. It will go and find it.</p>
          <Link href="/profile" className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-lime py-4 pl-7 pr-6 text-sm font-semibold text-night transition hover:bg-lime-soft">
            Set up your profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-fg/45 sm:flex-row">
          <Logo />
          <p className="text-center font-mono text-[11px]">Nebius × NVIDIA Global AI Hackathon · MIT licence</p>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition hover:text-fg">GitHub <ArrowUpRight className="h-3.5 w-3.5" /></a>
        </div>
      </footer>
    </div>
  );
}
