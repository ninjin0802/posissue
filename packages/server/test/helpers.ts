// サーバーの流れを試すための、本物に近い偽物の Env（D1 は node:sqlite、外部 API は fetch の差し替え）
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import type { Env } from "../src/index";

class Stmt {
  private args: unknown[] = [];
  constructor(private db: DatabaseSync, private sql: string) {}
  bind(...a: unknown[]) { this.args = a; return this; }
  async first<T>(col?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.args as never[])) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (col ? row[col] : { ...row }) as T;
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...(this.args as never[]));
    return { success: true, meta: { changes: Number(r.changes) } };
  }
  async all<T>() { return { results: this.db.prepare(this.sql).all(...(this.args as never[])) as T[] }; }
}

export function fakeD1() {
  const db = new DatabaseSync(":memory:");
  const dir = join(__dirname, "../../../apps/hosted/migrations");
  for (const f of readdirSync(dir).sort()) db.exec(readFileSync(join(dir, f), "utf8"));
  return { db, d1: { prepare: (sql: string) => new Stmt(db, sql) } as unknown as D1Database };
}

/** 回数制限：limit 回までは通す */
export function fakeLimiter(limit = 1000) {
  const n = new Map<string, number>();
  return { limit: async ({ key }: { key: string }) => { const c = (n.get(key) ?? 0) + 1; n.set(key, c); return { success: c <= limit }; } } as unknown as RateLimit;
}

export async function pkcs8Pem() {
  const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign"]);
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
  return `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
}

export async function makeEnv(over: Partial<Env> = {}) {
  const { db, d1 } = fakeD1();
  const env: Env = {
    DB: d1, RL_IP: fakeLimiter(), RL_ADMIN: fakeLimiter(),
    GITHUB_APP_ID: "1", GITHUB_APP_PRIVATE_KEY: await pkcs8Pem(), GITHUB_APP_SLUG: "posissue",
    GITHUB_WEBHOOK_SECRET: "whsec", GITHUB_CLIENT_ID: "cid", GITHUB_CLIENT_SECRET: "csec",
    SESSION_SECRET: "sess", TURNSTILE_SITE_KEY: "site", TURNSTILE_SECRET: "real-secret",
    ...over,
  };
  return { env, db };
}

export interface Calls { issues: { repo: string; body: Record<string, unknown> }[]; turnstile: number }

/** GitHub と Turnstile への fetch を差し替える。issue の番号は 100 から */
export function mockFetch(opt: { turnstileOk?: boolean; hostname?: string; issueFails?: boolean; userRepos?: Record<number, { full_name: string; private: boolean; permissions: { admin: boolean } }[]>; installations?: number[] } = {}) {
  const calls: Calls = { issues: [], turnstile: 0 };
  let n = 100;
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes("turnstile/v0/siteverify")) { calls.turnstile++; return json({ success: opt.turnstileOk ?? true, hostname: opt.hostname ?? "posissue.test" }); }
    if (url.includes("/access_tokens")) return json({ token: "inst-token", expires_at: new Date(Date.now() + 3600e3).toISOString() });
    const m = url.match(/\/repos\/([^/]+\/[^/]+)\/issues$/);
    if (m) {
      if (opt.issueFails) return json({ message: "boom" }, 500);
      calls.issues.push({ repo: m[1], body: JSON.parse(String(init?.body)) });
      const num = n++;
      return json({ number: num, html_url: `https://github.com/${m[1]}/issues/${num}` }, 201);
    }
    if (url.includes("login/oauth/access_token")) return json({ access_token: "user-token" });
    const r = url.match(/\/user\/installations\/(\d+)\/repositories/);
    if (r) { const list = opt.userRepos?.[Number(r[1])]; return list ? json({ repositories: list }) : json({ message: "Not Found" }, 404); }
    if (url.includes("/user/installations")) return json({ installations: (opt.installations ?? []).map((id) => ({ id })) });
    if (url.match(/\/applications\/[^/]+\/token$/)) return json({}, 200);
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  return calls;
}
