"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountChip } from "./AccountChip";
import { ArrowUpRight, CalendarCheck, Crosshair, Github, Radar, UserRound } from "lucide-react";

export const REPO_URL = "https://github.com/PinnacleCryptNG/grant-hunter";

const items = [
  { href: "/dashboard", label: "Hunt", icon: Radar, match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/o/") },
  { href: "/digest", label: "Today", icon: CalendarCheck, match: (p: string) => p.startsWith("/digest") },
  { href: "/profile", label: "Profile", icon: UserRound, match: (p: string) => p.startsWith("/profile") },
];

export function Logo() {
  return (
    <span className="group flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-tight text-fg">
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-lime text-night shadow-[0_0_24px_-4px_rgba(12,17,27,0.6)]">
        <Crosshair className="h-[18px] w-[18px] transition-transform duration-700 group-hover:rotate-90" strokeWidth={2.4} />
      </span>
      Grant Hunter
    </span>
  );
}

export function Nav() {
  const path = usePathname();
  if (path === "/") {
    return (
      <header className="fixed inset-x-0 top-3 z-40 px-3">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl bg-night/60 pl-3 pr-2 ring-1 ring-white/10 backdrop-blur-xl">
          <Link href="/" aria-label="Grant Hunter home"><Logo /></Link>
          <div className="flex items-center gap-1">
            <a href="#how" className="hidden rounded-lg px-3 py-1.5 text-sm text-fg/60 transition hover:text-fg sm:block">How it works</a>
            <a href="#trust" className="hidden rounded-lg px-3 py-1.5 text-sm text-fg/60 transition hover:text-fg sm:block">Trust</a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-fg/60 transition hover:text-fg md:flex"><Github className="h-4 w-4" /> GitHub</a>
            <Link href="/dashboard" className="group ml-1 inline-flex items-center gap-1 rounded-xl bg-lime px-3.5 py-2 text-sm font-semibold text-night transition hover:bg-lime-soft">
              Open app <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>
    );
  }
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-night/70 backdrop-blur-xl">
        <div className="mx-auto flex h-15 max-w-5xl items-center justify-between px-4">
          <Link href="/" aria-label="Grant Hunter home"><Logo /></Link>
          <nav className="hidden gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06] sm:flex">
            {items.map(({ href, label, icon: Icon, match }) => (
              <Link key={href} href={href} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${match(path) ? "bg-lime text-night" : "text-fg/60 hover:bg-white/5 hover:text-fg"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
          <AccountChip />
        </div>
      </header>
      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-2xl bg-surface/90 pb-[env(safe-area-inset-bottom)] ring-1 ring-white/10 backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-3">
          {items.map(({ href, label, icon: Icon, match }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${match(path) ? "text-lime" : "text-fg/45"}`}>
              <Icon className="h-5 w-5" strokeWidth={match(path) ? 2.4 : 2} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
