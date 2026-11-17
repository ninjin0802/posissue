import { describe, expect, it } from "vitest";
import { normalizeDailyLimit, normalizeOrigins, signSession, verifySession } from "../src/session";

describe("session", () => {
  it("signs, verifies, and rejects tampering and expiry", async () => {
    const t = await signSession("s", ["a/b"], 1000);
    expect(await verifySession("s", t, 1001)).toEqual(["a/b"]);
    expect(await verifySession("other", t, 1001)).toBeNull();
    expect(await verifySession("s", t, 1000 + 31 * 60)).toBeNull();
    const [, sig] = t.split(".");
    const forged = btoa(JSON.stringify({ r: ["x/y"], e: 99999 })).replace(/=+$/, "");
    expect(await verifySession("s", `${forged}.${sig}`, 1001)).toBeNull();
    expect(await verifySession("s", 123, 1001)).toBeNull();
  });
});

describe("normalizeOrigins", () => {
  it("accepts bare origins and rejects anything that could break CSP", () => {
    expect(normalizeOrigins(["https://a.com", "https://a.com/", " http://localhost:3000 ", ""])).toEqual(["https://a.com", "http://localhost:3000"]);
    for (const bad of ["https://a.com/path", "https://a.com; script-src *", "javascript:alert(1)", "https://u:p@a.com", "a.com", "https://a.com?x"]) {
      expect(normalizeOrigins([bad])).toBeNull();
    }
    expect(normalizeOrigins(Array(11).fill("https://a.com"))).toBeNull();
  });
  it("validates daily limit", () => {
    expect(normalizeDailyLimit(100)).toBe(100);
    expect(normalizeDailyLimit(null)).toBeNull();
    for (const bad of [0, 1001, 1.5, "10"]) expect(normalizeDailyLimit(bad)).toBeUndefined();
  });
});
