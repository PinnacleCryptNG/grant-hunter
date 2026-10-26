"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Hunt", icon: "M10.5 3a7.5 7.5 0 015.9 12.1l4.2 4.2-1.4 1.4-4.2-4.2A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" },
  { href: "/digest", label: "Today", icon: "M7 2h2v2h6V2h2v2h3a1 1 0 011 1v15a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1h3V2zm12 8H5v9h14v-9zM8 12h3v3H8v-3z" },
  { href: "/profile", label: "Profile", icon: "M12 2a5 5 0 110 10 5 5 0 010-10zm0 12c4.4 0 8 2.2 8 5v3H4v-3c0-2.8 3.6-5 8-5z" },
];

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/o/") : path.startsWith(href));
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" /></svg>
            </span>
            Grant Hunter
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active(i.href) ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {i.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-3">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(i.href) ? "text-slate-900" : "text-slate-400"}`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d={i.icon} /></svg>
              {i.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
