import { describe, expect, it } from "vitest";
import { draftKindsFor, workTypeOf } from "../src/lib/actions";

const x = (summary: string, workType?: "writing") => ({ summary, requiredSkills: [], howToApply: { value: "unknown", evidence: null }, workType });

describe("kind-aware drafts", () => {
  it("never offers an X thread for a hackathon", () => {
    const w = workTypeOf(x("Build a dApp on NEAR"), "hackathon", "NEAR hackathon");
    expect(w).toBe("build");
    expect(draftKindsFor("hackathon", w)).toEqual(["plan", "writeup"]);
  });
  it("detects writing and video contests from the text", () => {
    expect(workTypeOf(x("Write an article about Solana validators"), "bounty")).toBe("writing");
    expect(workTypeOf(x("Make a YouTube video explaining the protocol"), "contest")).toBe("video");
  });
  it("prefers the extracted work type and puts the application first for grants", () => {
    expect(workTypeOf(x("anything", "writing"), "grant")).toBe("writing");
    expect(draftKindsFor("grant", "build")[0]).toBe("application");
  });
});
