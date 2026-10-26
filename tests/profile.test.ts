import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE, hasProfileSignal } from "@/lib/profile";

describe("hasProfileSignal", () => {
  it("is false for an empty profile", () => expect(hasProfileSignal(EMPTY_PROFILE)).toBe(false));
  it("is true once a skill, interest or ecosystem is set", () => {
    expect(hasProfileSignal({ ...EMPTY_PROFILE, skills: ["Rust"] })).toBe(true);
    expect(hasProfileSignal({ ...EMPTY_PROFILE, ecosystems: ["Base"] })).toBe(true);
  });
});
