import { describe, expect, it } from "vitest";
import { budgetConfig, budgetMessage, estimateCredits, pacedAllowance } from "@/lib/budget";

describe("Tavily credit budget", () => {
  it("paces the month with a daily share plus a burst", () => {
    expect(pacedAllowance(900, 120, new Date("2026-11-01T06:00:00Z"))).toBe(150);
    expect(pacedAllowance(900, 120, new Date("2026-11-15T06:00:00Z"))).toBe(570);
    expect(pacedAllowance(900, 120, new Date("2026-11-30T06:00:00Z"))).toBe(900);
  });
  it("estimates credits from Tavily's published prices", () => {
    expect(estimateCredits("search", 1, "advanced")).toBe(2);
    expect(estimateCredits("search", 1, "basic")).toBe(1);
    expect(estimateCredits("extract", 7)).toBe(2);
    expect(estimateCredits("crawl", 6)).toBe(4);
  });
  it("reads overrides, including zero, and ignores junk", () => {
    expect(budgetConfig({ TAVILY_MONTHLY_BUDGET: "400", TAVILY_DAILY_BURST: "0", TAVILY_HUNT_ESTIMATE: "x" })).toMatchObject({ monthly: 400, burst: 0, huntCost: 25 });
  });
  it("tells the visitor when hunts come back", () => {
    expect(budgetMessage({ limitedBy: "pace" })).toMatch(/tomorrow/);
    expect(budgetMessage({ limitedBy: "account" })).toMatch(/next month/);
  });
});
