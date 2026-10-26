// Test-only stand-in for Nebius Token Factory's /v1/chat/completions, used to exercise the
// pipeline offline (NEBIUS_BASE_URL=http://localhost:4010/v1/). Production always calls Token Factory.
import http from "node:http";

const port = Number(process.env.MOCK_PORT || 4010);

function pageOf(user) {
  const m = user.match(/PAGE CONTENT:\n"""\n([\s\S]*)\n"""/);
  return m ? m[1] : "";
}
function quote(page, re) {
  const line = page.split(/\n+/).find((l) => re.test(l));
  return line ? line.trim().slice(0, 180) : null;
}
const field = (page, re) => {
  const q = quote(page, re);
  return q ? { value: q, evidence: q } : { value: "unknown", evidence: null };
};

function extract(user) {
  const page = pageOf(user);
  const title = (user.match(/PAGE TITLE: (.*)/) || [])[1] || "Untitled";
  const reward = field(page, /\$\s?\d|USDC|USDT|prize/i);
  const usd = reward.value.match(/\$\s?([\d,]+)/);
  const deadline = field(page, /deadline|submissions? (close|due)|ends? on/i);
  const future = new Date(Date.now() + 12 * 86400000).toISOString();
  return {
    isSingleOpportunity: !/\b(all|browse|explore) (bounties|hackathons|grants)\b/i.test(page),
    title,
    organizer: field(page, /hosted by|organi[sz]ed by|sponsored by/i),
    kind: /hackathon/i.test(title + page) ? "hackathon" : /bounty/i.test(title) ? "bounty" : /grant/i.test(title + page) ? "grant" : "other",
    summary: page.replace(/\s+/g, " ").slice(0, 160),
    reward,
    rewardUsdEstimate: usd ? Number(usd[1].replace(/,/g, "")) : null,
    deadline,
    deadlineIso: deadline.value === "unknown" ? null : future,
    deadlineTimezone: "unstated",
    eligibility: field(page, /eligib|open to/i),
    eligibleCountries: field(page, /countr|worldwide|global/i),
    payoutMethod: field(page, /paid in|payout|USDC|USDT/i),
    paidInSponsorToken: "unknown",
    entryFee: { value: "unknown", evidence: null },
    howToApply: field(page, /apply|submit/i),
    requiredSkills: ["TypeScript"],
    openStatus: "open",
    unknownFields: [],
    // Hallucination probe: the extractor must drop this because the quote is not on the page.
    ...(Math.random() < 0.5 ? { payoutMethod: { value: "Paid in USDC within 7 days", evidence: "Winners are paid in USDC within 7 days of judging" } } : {}),
  };
}

function respond(model, system, user) {
  if (system.includes("verification module")) return JSON.stringify(extract(user));
  if (system.includes("scoring module"))
    return JSON.stringify({
      score: 40 + Math.floor(Math.random() * 55),
      verdict: "Good skill match; confirm eligibility before applying.",
      reasons: [{ type: "plus", text: "TypeScript and AI agents match the brief." }, { type: "minus", text: "Payout method not stated." }],
      risks: [{ code: "short_deadline", label: "Short deadline", severity: "low", detail: "Under two weeks left." }],
    });
  if (system.includes("search queries")) return JSON.stringify({ queries: ["AI agent hackathon open submissions", "Solana developer grants open", "open source TypeScript bounty"] });
  if (system.includes("daily digest")) {
    const items = JSON.parse(user.split("\n").slice(1).join("\n"));
    return JSON.stringify({ headline: "Five strong fits, two closing this week", items: items.map((i) => ({ id: i.id, why: `Strong fit (${i.score}).`, nextStep: "Draft the application tonight." })) });
  }
  if (system.includes("reasoning module"))
    return `<think>weighing...</think>${JSON.stringify({ summary: "Worth applying.", strengths: ["Relevant portfolio"], gaps: ["Unknown payout"], questionsToVerify: ["Is my country eligible?"], effortEstimateHours: 12, expectedValueNote: "Reward exceeds 12h x rate.", recommendation: "apply" })}`;
  if (system.includes("writing module")) return `## Application\n\n**One-liner:** I build AI agents.\n\n[Check: confirm the deadline]\n\n_model: ${model}_`;
  return "{}";
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.url.endsWith("/models"))
        return res.writeHead(200, { "content-type": "application/json" }).end(
          JSON.stringify({ object: "list", data: ["nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B", "nvidia/nemotron-3-super-120b-a12b", "nvidia/Nemotron-3-Ultra-550b-a55b"].map((id) => ({ id, object: "model", owned_by: "nvidia" })) }),
        );
      if (!req.url.endsWith("/chat/completions")) return res.writeHead(404).end();
      const b = JSON.parse(body);
      const system = b.messages.find((m) => m.role === "system")?.content ?? "";
      const user = b.messages.find((m) => m.role === "user")?.content ?? "";
      const content = respond(b.model, system, user);
      console.log(new Date().toISOString(), b.model, system.slice(0, 60).replace(/\n/g, " "));
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({ id: "mock", object: "chat.completion", created: Date.now() / 1000, model: b.model, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }),
      );
    });
  })
  .listen(port, () => console.log(`mock token factory on :${port}`));
