import { describe, expect, it } from "vitest";
import { appJwt, verifyWebhook } from "../src/github";

describe("github", () => {
  it("signs a verifiable RS256 JWT from a PKCS#8 key", async () => {
    const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
    const jwt = await appJwt("123", pem, 1000);
    const [h, b, s] = jwt.split(".");
    const dec = (x: string) => Uint8Array.from(atob(x.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    expect(JSON.parse(new TextDecoder().decode(dec(b)))).toEqual({ iat: 940, exp: 1540, iss: "123" });
    expect(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", kp.publicKey, dec(s), new TextEncoder().encode(`${h}.${b}`))).toBe(true);
    await expect(appJwt("1", "-----BEGIN RSA PRIVATE KEY-----x")).rejects.toThrow(/PKCS#8/);
  });
  it("verifies webhook signatures", async () => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("sec"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("{}")))].map((x) => x.toString(16).padStart(2, "0")).join("");
    expect(await verifyWebhook("sec", "{}", `sha256=${sig}`)).toBe(true);
    expect(await verifyWebhook("sec", "{1}", `sha256=${sig}`)).toBe(false);
    expect(await verifyWebhook("sec", "{}", null)).toBe(false);
  });
});
