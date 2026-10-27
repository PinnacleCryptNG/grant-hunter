/**
 * Extraction accuracy eval: runs the real extraction step (Nemotron via Token Factory) over 20 saved pages
 * and compares against hand labels. Needs NEBIUS_API_KEY. Usage: npm run eval
 */
import { readFileSync, writeFileSync } from "node:fs";
import { extractOpportunity } from "../src/lib/extract";
import type { Extracted, Field } from "../src/lib/types";

type Label = { single?: boolean; reward?: string; deadline?: string; status?: string };
const index = JSON.parse(readFileSync("eval/pages/index.json", "utf8")) as { id: string; url: string; title: string }[];
const labels = JSON.parse(readFileSync("eval/labels.json", "utf8")) as Record<string, Label>;
const FIELDS = ["organizer", "reward", "deadline", "eligibility", "eligibleCountries", "payoutMethod", "entryFee", "howToApply"] as const;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const tally: Record<string, [number, number]> = {};
function check(k: string, ok: boolean) {
  tally[k] ??= [0, 0];
  tally[k][0] += ok ? 1 : 0;
  tally[k][1]++;
}
let stated = 0, grounded = 0, unknown = 0;
const rows: unknown[] = [];

for (const p of index) {
  const text = readFileSync(`eval/pages/${p.id}.md`, "utf8");
  const l = labels[p.id] ?? {};
  let x: Extracted;
  try {
    x = (await extractOpportunity({ url: p.url, title: p.title, text })).extracted;
  } catch (e) {
    console.log(p.id, "ERROR", String(e).slice(0, 120));
    check("ran", false);
    continue;
  }
  check("ran", true);
  if (l.single !== undefined) check("single-opportunity", x.isSingleOpportunity === l.single);
  if (l.reward) check("reward", x.reward.value.replace(/,/g, "").includes(l.reward.replace(/,/g, "")));
  if (l.deadline) check("deadline", x.deadline.value.toLowerCase().includes(l.deadline.toLowerCase()));
  if (l.status) check("open/closed", x.openStatus === l.status);
  const page = norm(text);
  for (const f of FIELDS) {
    const v = x[f] as Field;
    if (v.value === "unknown") {
      unknown++;
      continue;
    }
    stated++;
    if (v.evidence && page.includes(norm(v.evidence))) grounded++;
  }
  rows.push({ id: p.id, single: x.isSingleOpportunity, reward: x.reward.value, deadline: x.deadline.value, status: x.openStatus });
  console.log(p.id, x.isSingleOpportunity ? "single" : "not-single", "|", x.reward.value.slice(0, 40), "|", x.deadline.value.slice(0, 30), "|", x.openStatus);
}

const pct = ([a, b]: [number, number]) => `${a}/${b} (${b ? Math.round((100 * a) / b) : 0}%)`;
const summary = {
  ...Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, pct(v)])),
  "fields with a value": stated,
  "values backed by a quote found on the page": pct([grounded, stated]),
  "fields left unknown": unknown,
};
console.table(summary);
writeFileSync("eval/results.json", JSON.stringify({ ranAt: new Date().toISOString(), summary, rows }, null, 1));
