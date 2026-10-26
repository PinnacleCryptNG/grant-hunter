import { describe, expect, it } from "vitest";
import type { Digest } from "@/lib/digest";
import { digestMessage, dueIn, webhookSecret } from "@/lib/telegram";

const now = Date.parse("2026-10-26T12:00:00Z");
const d: Digest = {
  day: "2026-10-26",
  headline: "Two closing this week",
  items: [
    { id: 7, title: "Rust <Solana> bounty & more", score: 82, deadline: "2026-10-29T12:00:00Z", why: "Fits your Rust work", nextStep: "Draft it" },
    { id: 9, title: "Open grant", score: null, deadline: null, why: "", nextStep: "" },
  ],
  model: null,
  generatedAt: "2026-10-26T06:00:00Z",
};

describe("telegram digest", () => {
  it("formats a safe HTML message with links, scores and countdowns", () => {
    const m = digestMessage(d, "https://x.app", now);
    expect(m).toContain('<a href="https://x.app/o/7">Rust &lt;Solana&gt; bounty &amp; more</a> · score 82 · due in 3 days');
    expect(m).toContain("→ Draft it");
    expect(m).toContain('<a href="https://x.app/o/9">Open grant</a>\n');
    expect(m).toContain('<a href="https://x.app/digest">');
  });
  it("describes deadlines in days and drops past ones", () => {
    expect(dueIn("2026-10-26T20:00:00Z", now)).toBe("due tomorrow");
    expect(dueIn("2026-10-26T12:00:00Z", now)).toBe("due today");
    expect(dueIn("2026-10-20T00:00:00Z", now)).toBeNull();
    expect(dueIn(null, now)).toBeNull();
  });
  it("derives a webhook secret Telegram accepts", () => {
    expect(webhookSecret("123:abc")).toMatch(/^[a-f0-9]{48}$/);
    expect(webhookSecret("123:abc")).not.toBe(webhookSecret("123:abd"));
  });
});
