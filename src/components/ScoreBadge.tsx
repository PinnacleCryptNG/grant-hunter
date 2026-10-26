export function scoreTone(score: number | null) {
  if (score === null) return { ring: "stroke-slate-300", text: "text-slate-500" };
  if (score >= 75) return { ring: "stroke-emerald-500", text: "text-emerald-700" };
  if (score >= 50) return { ring: "stroke-amber-500", text: "text-amber-700" };
  return { ring: "stroke-rose-400", text: "text-rose-600" };
}

export function ScoreBadge({ score, size = 52 }: { score: number | null; size?: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const t = scoreTone(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Fit score ${score ?? "unscored"} out of 100`}>
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
        <circle cx="24" cy="24" r={r} className="stroke-slate-100" strokeWidth="5" fill="none" />
        <circle cx="24" cy="24" r={r} className={t.ring} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * (score ?? 0)) / 100} />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums ${t.text}`}>{score ?? "–"}</span>
    </div>
  );
}
