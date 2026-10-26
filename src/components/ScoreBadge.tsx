export function scoreTone(score: number | null) {
  if (score === null) return { ring: "stroke-white/20", text: "text-fg/50", glow: "" };
  if (score >= 75) return { ring: "stroke-lime", text: "text-lime", glow: "drop-shadow-[0_0_8px_rgba(198,244,50,0.55)]" };
  if (score >= 50) return { ring: "stroke-amber-400", text: "text-amber-300", glow: "" };
  return { ring: "stroke-rose-400", text: "text-rose-300", glow: "" };
}

export function ScoreBadge({ score, size = 52 }: { score: number | null; size?: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const t = scoreTone(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Fit score ${score ?? "unscored"} out of 100`}>
      <svg viewBox="0 0 48 48" className={`h-full w-full -rotate-90 ${t.glow}`}>
        <circle cx="24" cy="24" r={r} className="stroke-white/10" strokeWidth="5" fill="none" />
        <circle cx="24" cy="24" r={r} className={t.ring} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={c} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)" }} strokeDashoffset={c - (c * (score ?? 0)) / 100} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums ${t.text}`}>{score ?? "–"}</span>
    </div>
  );
}
