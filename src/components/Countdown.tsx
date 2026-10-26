"use client";
import { useEffect, useState } from "react";
import { timeLeft } from "@/lib/format";

const tone = {
  urgent: "text-rose-700 bg-rose-50 ring-rose-200",
  soon: "text-amber-800 bg-amber-50 ring-amber-200",
  later: "text-emerald-800 bg-emerald-50 ring-emerald-200",
  closed: "text-slate-500 bg-slate-100 ring-slate-200",
  unknown: "text-slate-600 bg-slate-50 ring-slate-200",
};

export function Countdown({ iso, className = "" }: { iso: string | null; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const t = timeLeft(iso, now ?? Date.now());
  return (
    <span suppressHydrationWarning className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset tabular-nums ${tone[t.urgency]} ${className}`}>
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6.2" /><path d="M8 4.5V8l2.4 1.6" strokeLinecap="round" /></svg>
      {t.label}
    </span>
  );
}
