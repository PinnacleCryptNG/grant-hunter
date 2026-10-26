import { describe, expect, it } from "vitest";
import { clientIp, limitMessage, limitsFor, windowStart } from "@/lib/ratelimit";
import { responseFormat } from "@/lib/llm";
import { EXTRACT_SCHEMA, SCORE_SCHEMA } from "@/lib/schemas";

describe("rate limits", () => {
  it("buckets time into fixed windows", () => {
    expect(windowStart(3_600_000 * 5 + 1234, 3600)).toBe(3600 * 5);
    expect(windowStart(3_600_000 * 5 - 1, 3600)).toBe(3600 * 4);
  });
  it("caps hunts per visitor, per IP and site-wide, with env overrides", () => {
    const l = limitsFor("hunt", "u1", "1.2.3.4", { HUNT_LIMIT_PER_USER_HOUR: "2" });
    expect(l.map((x) => x.key)).toEqual(["hunt:u:u1", "hunt:ip:1.2.3.4", "hunt:site"]);
    expect(l[0].max).toBe(2);
    expect(l[1].max).toBe(8);
    expect(l[2].windowSec).toBe(86400);
  });
  it("ignores invalid env overrides", () => {
    expect(limitsFor("llm", "u", "ip", { LLM_LIMIT_PER_USER_HOUR: "abc" })[0].max).toBe(20);
  });
  it("explains the limit in plain words", () => {
    const [you, , site] = limitsFor("hunt", "u", "ip", {});
    expect(limitMessage("hunt", you, 90)).toBe("You've reached the limit of 4 hunts per hour. Try again in 2 minutes.");
    expect(limitMessage("hunt", site, 90)).toMatch(/whole site/);
  });
  it("reads the client IP from proxy headers", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});

describe("structured output", () => {
  it("sends a strict json_schema when a schema is given, else JSON mode", () => {
    expect(responseFormat(true, SCORE_SCHEMA)).toEqual({ response_format: { type: "json_schema", json_schema: { name: "fit_score", schema: SCORE_SCHEMA.schema, strict: true } } });
    expect(responseFormat(true)).toEqual({ response_format: { type: "json_object" } });
    expect(responseFormat(false)).toEqual({});
  });
  it("requires every extraction field, so strict mode cannot drop one", () => {
    const s = EXTRACT_SCHEMA.schema as { required: string[]; properties: Record<string, unknown>; additionalProperties: boolean };
    expect(s.required.sort()).toEqual(Object.keys(s.properties).sort());
    expect(s.additionalProperties).toBe(false);
    expect(s.required).toContain("unknownFields");
  });
});
