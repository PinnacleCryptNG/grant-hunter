"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Crosshair, Github, Radar, UserRound } from "lucide-react";

export const REPO_URL = "https://github.com/PinnacleCryptNG/grant-hunter";

const items = [
  { href: "/dashboard", label: "Hunt", icon: Radar, match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/o/") },
  { href: "/digest", label: "Today", icon: CalendarCheck, match: (p: string) => p.startsWith("/digest") },
  { href: "/profile", label: "Profile", icon: UserRound, match: (p: string) => p.startsWith("/profile") },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-display text-[17px] font-semibold tracking-tight text-ink">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-emerald-400">
        <Crosshair className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </span>
      Grant Hunter
    </span>
  );
}

export function Nav() {
  const path = usePathname();
  const landing = path === "/";
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-ink/5 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-15 max-w-5xl items-center justify-between px-4">
          <Link href="/" aria-label="Grant Hunter home">
            <Logo />
          </Link>
          {landing ? (
            <div className="flex items-center gap-1">
              <a href="#how" className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink/65 hover:text-ink sm:block">How it works</a>
              <a href="#trust" className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink/65 hover:text-ink sm:block">Why trust it</a>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink/65 hover:text-ink md:flex">
                <Github className="h-4 w-4" /> GitHub
              </a>
              <Link href="/dashboard" className="ml-1 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ink-soft">Open app</Link>
            </div>
          ) : (
            <nav className="hidden gap-1 sm:flex">
              {items.map(({ href, label, icon: Icon, match }) => (
                <Link key={href} href={href} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${match(path) ? "bg-ink text-white" : "text-ink/65 hover:bg-ink/5 hover:text-ink"}`}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>
      {!landing && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
          <div className="grid grid-cols-3">
            {items.map(({ href, label, icon: Icon, match }) => (
              <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${match(path) ? "text-ink" : "text-ink/40"}`}>
                <Icon className={`h-5 w-5 ${match(path) ? "text-emerald-600" : ""}`} strokeWidth={match(path) ? 2.4 : 2} />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
