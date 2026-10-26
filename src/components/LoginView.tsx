"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Github } from "lucide-react";
import { useMe } from "./useMe";

const ERRORS: Record<string, string> = {
  unavailable: "GitHub sign-in isn't set up on this server yet. You can keep using the app without it.",
  denied: "GitHub sign-in was cancelled.",
  state: "That sign-in link expired. Please try again.",
  github: "GitHub didn't complete the sign-in. Please try again.",
};

export function LoginView() {
  const { me } = useMe();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e) setError(ERRORS[e] ?? ERRORS.github);
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-lime">Sign in</p>
      <h1 className="mt-4 text-[2.4rem] font-semibold leading-[1.02] sm:text-5xl">
        Your hunt, on <span className="font-serif font-normal italic text-lime">every device.</span>
      </h1>
      <p className="mt-5 text-[15px] leading-relaxed text-fg/55">
        Signing in is optional. Without it, Grant Hunter remembers you in this browser only. With GitHub, your profile,
        saved opportunities, drafts and what the agent has learned about your taste follow you anywhere. Anything you&apos;ve
        already done here comes with you.
      </p>
      {me?.github ? (
        <div className="mt-8 flex items-center gap-4">
          <p className="text-sm text-fg/70">Signed in as <span className="text-fg">@{me.github.login}</span></p>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-night transition hover:bg-lime-soft">Open the app <ArrowRight className="h-4 w-4" /></Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href="/api/auth/github" aria-disabled={me ? !me.available.github : undefined} className={`inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-lime px-6 py-3 text-[15px] font-semibold text-night shadow-[0_0_32px_-8px_rgba(198,244,50,0.6)] transition hover:bg-lime-soft ${me && !me.available.github ? "pointer-events-none opacity-50" : ""}`}>
            <Github className="h-5 w-5" /> Continue with GitHub
          </a>
          <Link href="/dashboard" className="text-center text-sm text-fg/50 transition hover:text-fg">or keep going without an account</Link>
        </div>
      )}
      {error && <p className="mt-5 text-sm text-rose-300">{error}</p>}
      <p className="mt-10 border-t border-white/[0.06] pt-5 text-xs leading-relaxed text-fg/35">
        Grant Hunter only reads your public GitHub name and avatar. It never asks for repository access and never posts anything.
      </p>
    </div>
  );
}
