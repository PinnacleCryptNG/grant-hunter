export function formatDeadline(iso: string | null, tz: string) {
  if (!iso) return "Deadline unknown";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}

export function timeLeft(iso: string | null, now = Date.now()) {
  if (!iso) return { label: "No deadline found", urgency: "unknown" as const, ms: Infinity };
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return { label: "Closed", urgency: "closed" as const, ms };
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const label = d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  return { label, urgency: d < 3 ? ("urgent" as const) : d < 10 ? ("soon" as const) : ("later" as const), ms };
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
