"use client";
import { useEffect, useState } from "react";

const LINES: { tag: string; tone: string; text: string }[] = [
  { tag: "plan", tone: "text-sky-300", text: "nemotron-nano → 3 searches from your skills" },
  { tag: "search", tone: "text-violet-300", text: "tavily → superteam.fun/earn, devpost.com, gitcoin.co, x.com" },
  { tag: "read", tone: "text-sky-300", text: "nemotron-nano → reward, deadline, eligibility, payout" },
  { tag: "verify", tone: "text-lime", text: "quote found on page ✓   no quote → \"unknown\"" },
  { tag: "risk", tone: "text-amber-300", text: "country · sponsor token · entry fee · vague terms" },
  { tag: "score", tone: "text-sky-300", text: "nemotron-super → fit 0–100 with reasons" },
  { tag: "draft", tone: "text-fuchsia-300", text: "nemotron-ultra → draft ready, waiting for your approval" },
];

export function HuntTerminal() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown((n) => (n >= LINES.length + 3 ? 0 : n + 1)), shown === 0 ? 600 : 850);
    return () => clearTimeout(t);
  }, [shown]);
  return (
    <div className="border-glow overflow-hidden rounded-2xl shadow-[0_30px_120px_-30px_rgba(198,244,50,0.25)]">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-[11px] text-fg/40">grant-hunter · hunt</span>
      </div>
      <ol className="min-h-[19rem] space-y-2.5 p-5 font-mono text-[12.5px] leading-relaxed sm:text-[13px]" aria-label="What a hunt does">
        {LINES.map((l, i) => (
          <li key={l.tag} className={`flex gap-3 transition-all duration-500 ${i < shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>
            <span className={`w-14 shrink-0 ${l.tone}`}>{l.tag}</span>
            <span className="text-fg/70">{l.text}</span>
          </li>
        ))}
        <li className={`flex gap-3 text-fg/40 ${shown > LINES.length ? "opacity-100" : "opacity-0"} transition-opacity`}>
          <span className="w-14 shrink-0 text-lime">done</span>
          <span className="caret">nothing sent. you review, approve, copy.</span>
        </li>
      </ol>
    </div>
  );
}
