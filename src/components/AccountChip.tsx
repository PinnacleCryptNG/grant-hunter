"use client";
import Link from "next/link";
import { Github } from "lucide-react";
import { useMe } from "./useMe";

export function AccountChip() {
  const { me } = useMe();
  if (!me) return <span className="h-8 w-20" />;
  if (me.github) {
    return (
      <Link href="/profile" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm text-fg/70 ring-1 ring-white/10 transition hover:text-fg hover:ring-white/20" title="Signed in with GitHub">
        {me.github.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.github.avatar} alt="" className="h-6 w-6 rounded-full" />
        ) : (
          <Github className="h-5 w-5" />
        )}
        <span className="max-w-[9rem] truncate">@{me.github.login}</span>
      </Link>
    );
  }
  if (!me.available.github) return null;
  return (
    <Link href="/login" className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-fg/70 ring-1 ring-white/15 transition hover:bg-white/5 hover:text-fg">
      <Github className="h-4 w-4" /> Sign in
    </Link>
  );
}
