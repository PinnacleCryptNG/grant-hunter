import { describe, expect, it } from "vitest";
import { MODEL_CANDIDATES, pickModel } from "@/lib/llm";

describe("pickModel", () => {
  it("uses the env override when set", () => {
    expect(pickModel("ultra", ["nvidia/Nemotron-3-Ultra-550b-a55b"], { NEMOTRON_ULTRA_MODEL: "custom/ultra" })).toBe("custom/ultra");
  });
  it("prefers the newest candidate Token Factory lists, matching case-insensitively", () => {
    expect(pickModel("super", ["nvidia/Llama-3_3-Nemotron-Super-49B-v1_5", "NVIDIA/Nemotron-3-Super-120B-A12B"], {})).toBe("NVIDIA/Nemotron-3-Super-120B-A12B");
  });
  it("falls back to an older candidate", () => {
    expect(pickModel("nano", ["nvidia/NVIDIA-Nemotron-Nano-9B-v2", "meta/llama"], {})).toBe("nvidia/NVIDIA-Nemotron-Nano-9B-v2");
  });
  it("fuzzy-matches an unknown Nemotron of the right tier, skipping vision models", () => {
    expect(pickModel("nano", ["nvidia/Nemotron-Nano-VL-12B", "nvidia/Nemotron-4-Nano-8B"], {})).toBe("nvidia/Nemotron-4-Nano-8B");
  });
  it("uses the first candidate when the model list is unavailable", () => {
    expect(pickModel("ultra", [], {})).toBe(MODEL_CANDIDATES.ultra[0]);
  });
});
