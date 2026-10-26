import { writeFileSync } from "node:fs";
import { tavilySearch } from "../src/lib/tavily";
import { isCandidateUrl, normalizeUrl } from "../src/lib/hunt";

const queries: [string, string[]][] = [
  ["Superteam Earn bounty listing", ["superteam.fun"]],
  ["Superteam Earn grant listing", ["superteam.fun"]],
  ["online hackathon open for submissions prizes", ["devpost.com"]],
  ["AI hackathon prizes eligibility", ["devpost.com"]],
  ["ecosystem grants program apply eligibility", []],
  ["creator contest prize rules eligibility deadline", []],
  ["Gitcoin grants round", ["gitcoin.co"]],
];
const seen = new Set<string>();
const out: { id: string; url: string; title: string }[] = [];
for (const [q, d] of queries) {
  const res = await tavilySearch({ query: q, includeDomains: d.length ? d : undefined, maxResults: 6 });
  for (const r of res) {
    const url = normalizeUrl(r.url);
    if (!isCandidateUrl(url) || seen.has(url) || !r.raw_content || r.raw_content.length < 800) continue;
    if (out.filter((o) => o.url.includes(new URL(url).hostname.split(".").slice(-2).join("."))).length >= 5) continue;
    seen.add(url);
    const id = `p${String(out.length + 1).padStart(2, "0")}`;
    writeFileSync(`eval/pages/${id}.md`, `# ${r.title}\n\n${r.raw_content.slice(0, 14000)}`);
    out.push({ id, url, title: r.title });
    if (out.length >= 20) break;
  }
  if (out.length >= 20) break;
}
writeFileSync("eval/pages/index.json", JSON.stringify(out, null, 1));
console.log(out.length);
