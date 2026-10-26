import type { Status } from "@/lib/types";

const styles: Record<Status, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200",
  saved: "bg-violet-50 text-violet-700 ring-violet-200",
  applied: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function StatusPill({ status }: { status: Status }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${styles[status]}`}>{status}</span>;
}
