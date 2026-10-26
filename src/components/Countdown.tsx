"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { timeLeft } from "@/lib/format";

const tone = {
  urgent: "text-rose-300 bg-rose-400/10 ring-rose-400/25",
  soon: "text-amber-300 bg-amber-400/10 ring-amber-400/25",
  later: "text-lime bg-lime-400/10 ring-lime-400/25",
  closed: "text-fg/50 bg-white/[0.07] ring-white/10",
  unknown: "text-fg/65 bg-white/[0.04] ring-white/10",
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
      <Clock aria-hidden className="h-3 w-3" />
      {t.label}
    </span>
  );
}
