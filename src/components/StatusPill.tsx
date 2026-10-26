import type { Status } from "@/lib/types";

const styles: Record<Status, string> = {
  new: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
  saved: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  applied: "bg-lime-400/10 text-lime ring-lime-400/25",
  rejected: "bg-white/[0.07] text-fg/50 ring-white/10",
};

export function StatusPill({ status }: { status: Status }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${styles[status]}`}>{status}</span>;
}
