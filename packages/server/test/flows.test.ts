import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHandler } from "../src/index";
import { signSession } from "../src/session";
import { makeEnv, mockFetch } from "./helpers";

const ORIGIN = "https://posissue.test";
const KEY = "pk_" + "a".repeat(24);
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const handler = createHandler();
const call = (env: Awaited<ReturnType<typeof makeEnv>>["env"], path: string, init: RequestInit & { ip?: string } = {}) =>
  handler.fetch!(new Request(ORIGIN + path, { ...init, headers: { "cf-connecting-ip": init.ip ?? "1.1.1.1", ...(init.headers as Record<string, string>) } }) as never, env, {} as never);

const report = (over: Record<string, unknown> = {}) => JSON.stringify({
  projectKey: KEY, kind: "bug", title: "Save fails", fields: { steps: "1. click", actual: "nothing" },
  turnstileToken: "tok", elapsedMs: 5000, meta: { page: "https://app.example/x" }, ...over,
});
const post = (env: Parameters<typeof call>[0], body: string, headers: Record<string, string> = {}, ip?: string) =>
  call(env, "/api/report", { method: "POST", body, headers: { "content-type": "application/json", ...headers }, ip });

async function setup(approval = 0, extra = "") {
  const ctx = await makeEnv();
  ctx.db.exec(`INSERT INTO projects (key, installation_id, repo, approval${extra ? ", allowed_origins" : ""}) VALUES ('${KEY}', 7, 'me/app', ${approval}${extra ? `, '${extra}'` : ""})`);
  return ctx;
}

describe("POST /api/report", () => {
  it("creates an issue with the right title, labels and neutralized body", async () => {
    const { env } = await setup();
    const calls = mockFetch();
    const res = await post(env, report({ fields: { steps: "ping @octocat", actual: "x" } }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ ok: true, issueNumber: 100 });
    expect(calls.issues).toHaveLength(1);
    const b = calls.issues[0].body as { title: string; body: string; labels: string[] };
    expect(calls.issues[0].repo).toBe("me/app");
    expect(b.title).toBe("[Bug] Save fails");
    expect(b.labels).toContain("via-widget");
    expect(b.body).toContain("@​octocat");
  });

  it("rejects cheap spam before calling Turnstile", async () => {
    const { env } = await setup();
    const calls = mockFetch();
    expect((await post(env, report({ hp: "bot" }))).status).toBe(422);
    expect((await post(env, report({ elapsedMs: 100 }))).status).toBe(422);
    expect((await post(env, report({ fields: { steps: "[a](//x.com) [b](//y.com) [c](//z.com)", actual: "x" } }))).status).toBe(422);
    expect((await post(env, "{bad json")).status).toBe(400);
    expect((await post(env, "x".repeat(30000))).status).toBe(400);
    expect(calls.turnstile).toBe(0);
  });

  it("rejects unknown projects, bad captcha and wrong hostname", async () => {
    const { env } = await setup();
    mockFetch();
    expect((await post(env, report({ projectKey: "pk_" + "b".repeat(24) }))).status).toBe(404);
    mockFetch({ turnstileOk: false });
    expect((await post(env, report())).status).toBe(403);
    mockFetch({ hostname: "evil.test" });
    expect((await post(env, report({ title: "other" }))).status).toBe(403);
  });

  it("enforces allowed origins", async () => {
    const { env } = await setup(0, "https://ok.example");
    mockFetch();
    expect((await post(env, report(), { origin: "https://evil.example" })).status).toBe(403);
    expect((await post(env, report(), { origin: "https://ok.example" })).status).toBe(201);
    expect((await post(env, report({ title: "same-origin" }), { origin: ORIGIN })).status).toBe(201);
  });

  it("detects duplicates and lets a failed send be retried", async () => {
    const { env } = await setup();
    mockFetch({ issueFails: true });
    expect((await post(env, report())).status).toBe(502);
    mockFetch();
    expect((await post(env, report())).status).toBe(201);
    expect((await post(env, report())).status).toBe(409);
  });

  it("enforces the daily limit", async () => {
    const { env, db } = await setup();
    db.exec(`UPDATE projects SET daily_limit = 1`);
    mockFetch();
    expect((await post(env, report({ title: "one" }))).status).toBe(201);
    expect((await post(env, report({ title: "two" }))).status).toBe(429);
  });

  it("holds reports in approval mode instead of creating issues", async () => {
    const { env, db } = await setup(1);
    const calls = mockFetch();
    const res = await post(env, report());
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, pending: true });
    expect(calls.issues).toHaveLength(0);
    expect(db.prepare("SELECT count(*) n FROM pending").get()).toEqual({ n: 1 });
  });
});

describe("POST /api/pending and /api/settings", () => {
  const admin = (env: Parameters<typeof call>[0], path: string, body: unknown, origin = ORIGIN) =>
    call(env, path, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", origin } });

  let ctx: Awaited<ReturnType<typeof setup>>;
  let session: string;
  let pendingId: string;
  beforeEach(async () => {
    ctx = await setup(1);
    mockFetch();
    await post(ctx.env, report());
    pendingId = (ctx.db.prepare("SELECT id FROM pending").get() as { id: string }).id;
    session = await signSession("sess", [["me/app", 7]]);
  });

  it("publishes a pending report once", async () => {
    const calls = mockFetch();
    const res = await admin(ctx.env, "/api/pending", { session, repo: "me/app", id: pendingId, action: "approve" });
    expect(await res.json()).toMatchObject({ ok: true, issueNumber: 100 });
    expect(calls.issues).toHaveLength(1);
    expect((await admin(ctx.env, "/api/pending", { session, repo: "me/app", id: pendingId, action: "approve" })).status).toBe(404);
  });

  it("restores the pending report when GitHub fails", async () => {
    mockFetch({ issueFails: true });
    expect((await admin(ctx.env, "/api/pending", { session, repo: "me/app", id: pendingId, action: "approve" })).status).toBe(502);
    expect(ctx.db.prepare("SELECT count(*) n FROM pending").get()).toEqual({ n: 1 });
  });

  it("rejects other repos, forged sessions, other origins and stale installations", async () => {
    expect((await admin(ctx.env, "/api/pending", { session, repo: "other/repo", id: pendingId, action: "reject" })).status).toBe(403);
    expect((await admin(ctx.env, "/api/pending", { session: "x.y", repo: "me/app", id: pendingId, action: "reject" })).status).toBe(401);
    expect((await admin(ctx.env, "/api/pending", { session, repo: "me/app", id: pendingId, action: "reject" }, "https://evil.example")).status).toBe(403);
    ctx.db.exec("UPDATE projects SET installation_id = 8");
    expect((await admin(ctx.env, "/api/pending", { session, repo: "me/app", id: pendingId, action: "reject" })).status).toBe(404);
  });

  it("discards a pending report", async () => {
    expect((await admin(ctx.env, "/api/pending", { session, repo: "me/app", id: pendingId, action: "reject" })).status).toBe(200);
    expect(ctx.db.prepare("SELECT count(*) n FROM pending").get()).toEqual({ n: 0 });
  });

  it("updates settings and validates input", async () => {
    const ok = await admin(ctx.env, "/api/settings", { session, repo: "me/app", allowedOrigins: ["https://a.example/"], dailyLimit: 10, approval: false });
    expect(await ok.json()).toEqual({ ok: true, allowedOrigins: ["https://a.example"], dailyLimit: 10, approval: false });
    expect(ctx.db.prepare("SELECT allowed_origins o, daily_limit l, approval a FROM projects").get()).toEqual({ o: "https://a.example", l: 10, a: 0 });
    expect((await admin(ctx.env, "/api/settings", { session, repo: "me/app", allowedOrigins: ["https://a.example; script-src *"], dailyLimit: 10, approval: false })).status).toBe(400);
    expect((await admin(ctx.env, "/api/settings", { session, repo: "me/app", allowedOrigins: [], dailyLimit: 5000, approval: false })).status).toBe(400);
  });
});

describe("pages and OAuth", () => {
  it("serves the landing page in the requested language and remembers it", async () => {
    const { env } = await setup();
    const res = await call(env, "/?lang=en");
    expect(await res.text()).toContain('<html lang="en">');
    expect(res.headers.get("set-cookie")).toContain("pi_lang=en");
    const ja = await call(env, "/", { headers: { "accept-language": "ja-JP" } });
    expect(await ja.text()).toContain('<html lang="ja">');
  });

  it("serves the form for active projects only", async () => {
    const { env } = await setup();
    expect((await call(env, `/r/${KEY}`)).status).toBe(200);
    expect((await call(env, `/r/pk_${"z".repeat(24)}`)).status).toBe(404);
  });

  it("redirects /admin to GitHub with a state cookie and ignores forged callbacks", async () => {
    const { env } = await setup();
    const res = await call(env, "/admin");
    expect(res.status).toBe(302);
    const state = new URL(res.headers.get("location")!).searchParams.get("state")!;
    expect(res.headers.get("set-cookie")).toContain(`pi_state=${state}`);
    // クッキーなしで code が来たら使わずに案内して止める
    const forged = await call(env, `/setup?code=x&state=${state}`);
    expect(forged.status).toBe(400);
  });

  it("shows only repositories the user can access after OAuth", async () => {
    const { env } = await setup();
    mockFetch({ installations: [7], userRepos: { 7: [{ full_name: "me/app", private: true, permissions: { admin: true } }] } });
    const start = await call(env, "/admin");
    const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
    const res = await call(env, `/setup?code=good&state=${encodeURIComponent(state)}`, { headers: { cookie: `pi_state=${state}` } });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("me/app");
    expect(html).toContain(KEY);
  });
});
