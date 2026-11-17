// 仕様: docs/spec/04-http-api.html, 05-data-model.html, 07-spam-security.html
import {
  assertForms, buildIssue, DEFAULT_FORMS, parseReportRequest, reportUrls,
  type ErrorCode, type FormTemplate, type ReportResponse,
} from "@posissue/core";
import { mount } from "posissue";
import { createIssue, isOurUserToken, userInstallationRepos, userInstallations, userToken, verifyWebhook, type GitHubCreds } from "./github";
import { formPage, ICON_SVG, keysPage, landingPage, messagePage, type KeyRow } from "./pages";
import { normalizeDailyLimit, normalizeOrigins, signSession, verifySession } from "./session";

export type { ReportRequest, ReportResponse, ErrorCode, FormTemplate, FormField } from "@posissue/core";
export { DEFAULT_FORMS } from "@posissue/core";

export interface Env {
  DB: D1Database;
  RL_IP: RateLimit;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_APP_SLUG: string;
  /** App の OAuth（/setup で持ち主を確かめる）。client id は公開してよい値 */
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  /** キー確認画面から設定を変えるときの署名用（4.6）。ランダムな長い文字列 */
  SESSION_SECRET: string;
  GITHUB_WEBHOOK_SECRET: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET: string;
  /** トップページのデモに使う projectKey（任意）。PosIssue 自身のリポジトリのキーを入れる */
  DEMO_KEY?: string;
}

export interface ServerConfig {
  /** 種別ごとのフォームの型。省略時は DEFAULT_FORMS。並び順がタブの順になる */
  forms?: FormTemplate[];
  labels?: string[];
  limits?: { projectPerDay?: number };
  minElapsedMs?: number;
  maxUrls?: number;
}

interface Project { key: string; installation_id: number; repo: string; allowed_origins: string; daily_limit: number | null; active: number }

const MAX_BODY = 20_000;

const STATUS: Record<ErrorCode, number> = {
  invalid_input: 400, captcha_failed: 403, forbidden_origin: 403, unknown_project: 404,
  duplicate: 409, spam: 422, rate_limited: 429, upstream_error: 502,
};

const WIDGET_JS =
  // wrangler(esbuild) の keepNames が関数本体に __name(...) を差し込むので、toString した先でも動くよう同名の素通し関数を置く
  `(function(){var __name=function(f){return f};var s=document.currentScript;if(!s)return;var mount=${mount.toString()};` +
  `var go=function(){mount({projectKey:s.dataset.key,endpoint:new URL(s.src).origin,position:s.dataset.position,label:s.dataset.label,lang:s.dataset.lang,` +
  `kinds:s.dataset.kinds?s.dataset.kinds.split(","):undefined})};document.body?go():addEventListener("DOMContentLoaded",go)})();`;

// スクリプトのない案内ページ用の既定 CSP。フォームとトップページは自分の CSP で上書きする
const STATIC_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; frame-ancestors 'none'";
const html = (body: string, headers: Record<string, string> = {}, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": STATIC_CSP, ...headers } });

const newKey = () => {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return "pk_" + Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => a[b % a.length]).join("");
};

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

const splitOrigins = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const origins = (p: Project) => splitOrigins(p.allowed_origins);

export function createHandler(config: ServerConfig = {}): ExportedHandler<Env> {
  const forms = config.forms ?? DEFAULT_FORMS;
  assertForms(forms);
  const minElapsed = config.minElapsedMs ?? 3000;
  const maxUrls = config.maxUrls ?? 2;
  const perDay = config.limits?.projectPerDay ?? 50;

  const getProject = (env: Env, key: string) =>
    env.DB.prepare("SELECT * FROM projects WHERE key = ? AND active = 1 AND banned = 0").bind(key).first<Project>();

  async function report(req: Request, env: Env, cors: (h: Headers) => void): Promise<Response> {
    const fail = (error: ErrorCode, key = "-") => {
      console.log(JSON.stringify({ rejected: error, key }));
      const r = Response.json({ ok: false, error } satisfies ReportResponse, { status: STATUS[error] });
      cors(r.headers);
      return r;
    };
    // 7.1 の順序どおり。安い検査から。
    // 7.1 #0: 巨大な本文は読む前に断る（正規の報告は最大でも 20KB に収まる）
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return fail("invalid_input");
    const text = await req.text();
    if (text.length > MAX_BODY) return fail("invalid_input");
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* 下で invalid_input */ }
    const r = parseReportRequest(json, forms);
    if (!r) return fail("invalid_input");
    if (r.hp) return fail("spam", r.projectKey);
    if (r.elapsedMs < minElapsed) return fail("spam", r.projectKey);
    if (reportUrls(r) > maxUrls) return fail("spam", r.projectKey);
    const p = await getProject(env, r.projectKey);
    if (!p) return fail("unknown_project", r.projectKey);
    const origin = req.headers.get("origin");
    const self = new URL(req.url).origin;
    const allowed = origins(p);
    if (origin && origin !== self && allowed.length && !allowed.includes(origin)) return fail("forbidden_origin", p.key);
    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    if (!(await env.RL_IP.limit({ key: ip })).success) return fail("rate_limited", p.key);

    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET);
    form.append("response", r.turnstileToken);
    form.append("remoteip", ip);
    const ts = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form })
      .then((x) => x.json<{ success: boolean; hostname?: string }>()).catch(() => ({ success: false, hostname: undefined }));
    if (!ts.success) return fail("captcha_failed", p.key);
    // 7.1 #8: 自分のフォームで取った認証か確かめる（Cloudflare のテスト用秘密キーは hostname が固定なので除く）
    if (!env.TURNSTILE_SECRET.startsWith("1x0000") && ts.hostname !== new URL(req.url).hostname) return fail("captcha_failed", p.key);

    const day = new Date().toISOString().slice(0, 10);
    const used = await env.DB.prepare(
      "INSERT INTO usage (key, day, count) VALUES (?, ?, 1) ON CONFLICT (key, day) DO UPDATE SET count = count + 1 RETURNING count",
    ).bind(p.key, day).first<number>("count");
    if ((used ?? 0) > (p.daily_limit ?? perDay)) return fail("rate_limited", p.key);

    const now = Math.floor(Date.now() / 1000);
    const hash = await sha256(JSON.stringify([p.key, r.kind, r.title, r.fields]));
    await env.DB.prepare("DELETE FROM recent_hashes WHERE created_at < ?").bind(now - 86400).run();
    const fresh = await env.DB.prepare("INSERT INTO recent_hashes (hash, created_at) VALUES (?, ?) ON CONFLICT DO NOTHING")
      .bind(hash, now).run();
    if (!fresh.meta.changes) return fail("duplicate", p.key);

    try {
      const issue = await createIssue(creds(env), p.installation_id, p.repo, buildIssue(r, forms, config.labels));
      const res = Response.json({ ok: true, issueNumber: issue.number, issueUrl: issue.html_url } satisfies ReportResponse, { status: 201 });
      cors(res.headers);
      return res;
    } catch (e) {
      console.log(String(e));
      await env.DB.prepare("DELETE FROM recent_hashes WHERE hash = ?").bind(hash).run(); // 失敗時は再送できるように
      return fail("upstream_error", p.key);
    }
  }

  // Origin の可否は report() 内で判定する（7.1 #6）。ここでは応答を読めるようにするだけ
  const corsFor = (req: Request) => (h: Headers) => {
    const origin = req.headers.get("origin");
    if (origin) { h.set("access-control-allow-origin", origin); h.set("vary", "origin"); }
  };

  /**
   * /setup（App のインストール直後）と /keys（あとから確認）の共通処理。
   * GitHub でログインしてもらい、本人がアクセスできるリポジトリのキーだけを表示する（4.3）。
   * state は "keys"（全インストール）か installation_id（そのインストールだけ）。
   */
  async function setup(req: Request, url: URL, env: Env) {
    // 4.3: OAuth の state は、こちらが発行してクッキーにも入れたものと一致したときだけ信じる（ログイン CSRF 対策）。
    // 一致しなければ code は使わず、認可からやり直す（インストール直後に GitHub から来た場合もここを通る。認可済みなら一瞬で戻ってくる）
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const cookie = /(?:^|;\s*)pi_state=([^;]+)/.exec(req.headers.get("cookie") ?? "")?.[1];
    const verified = !!(code && state && cookie && state === cookie);
    const target = verified ? state!.slice(state!.indexOf(".") + 1) : (url.searchParams.get("installation_id") ?? "keys");
    const one = Number(target);
    if (target !== "keys" && (!Number.isInteger(one) || one <= 0)) {
      return html(messagePage("Error", "<p>installation_id がありません。</p>"), {}, 400);
    }
    // GitHub から戻ってきたのにクッキーがない＝ブロックされている。やり直すと行き来が止まらないので案内を出す
    if (!verified && code && state && !cookie) {
      return html(messagePage("Cookie が必要です", `<p>ログインの確認に Cookie を使います。このサイト（posissue.2nj.lol）の Cookie を許可してから、<a href="/keys">もう一度お試しください</a>。</p>`), {}, 400);
    }
    if (!verified) return startAuth(env, target);
    // 7.3: GitHub API を呼ぶのはここからなので、ここで IP ごとに絞る（認可画面へのリダイレクトは数えない）
    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    if (!(await env.RL_IP.limit({ key: `setup:${ip}` })).success) {
      return html(messagePage("Too many requests", "<p>少し待ってからもう一度お試しください。</p>"), {}, 429);
    }
    const forbidden = () => html(messagePage("Forbidden", "<p>確認できませんでした。インストールしたアカウントでもう一度お試しください。</p>"), {}, 403);
    const rows: KeyRow[] = [];
    try {
      const token = await userToken(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, code);
      if (!token) return forbidden();
      const ids = target === "keys" ? await userInstallations(token) : [one];
      for (const id of ids) {
        const repos = await userInstallationRepos(token, id);
        if (!repos) { if (target !== "keys") return forbidden(); continue; }
        for (const repo of repos) rows.push(await ensureProject(env, id, repo));
      }
    } catch (e) {
      console.log(String(e));
      return html(messagePage("Error", "<p>GitHub との通信に失敗しました。時間をおいてお試しください。</p>"), {}, 502);
    }
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const session = await signSession(env.SESSION_SECRET, rows.filter((r) => r.key).map((r) => r.repo));
    return html(keysPage({ origin: url.origin, appSlug: env.GITHUB_APP_SLUG, rows, nonce, session, defaultDailyLimit: perDay, justInstalled: target !== "keys" }), {
      "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; style-src 'unsafe-inline'; img-src 'self'; frame-ancestors 'none'`,
      "cache-control": "no-store",
      "set-cookie": "pi_state=; Path=/setup; Max-Age=0; HttpOnly; Secure; SameSite=Lax", // 使い捨て
    });
  }

  /**
   * CLI 用（4.5）。GitHub のデバイスフローで作者自身がログインして得たユーザートークンを受け取り、
   * そのユーザーがアクセスできるリポジトリのキーを JSON で返す。トークンは保存しない。
   */
  async function apiKeys(req: Request, env: Env): Promise<Response> {
    const json = (body: unknown, status = 200) =>
      Response.json(body, { status, headers: { "cache-control": "no-store" } });
    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    if (!(await env.RL_IP.limit({ key: `keys:${ip}` })).success) return json({ ok: false, error: "rate_limited" }, 429);
    const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
    if (!token) return json({ ok: false, error: "unauthorized" }, 401);
    try {
      if (!(await isOurUserToken(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, token))) return json({ ok: false, error: "unauthorized" }, 401);
      const rows: KeyRow[] = [];
      for (const id of await userInstallations(token)) {
        for (const repo of (await userInstallationRepos(token, id)) ?? []) rows.push(await ensureProject(env, id, repo));
      }
      return json({ ok: true, endpoint: new URL(req.url).origin, keys: rows.map((r) => ({ repo: r.repo, key: r.key, stopped: r.key === null, allowedOrigins: r.origins, dailyLimit: r.dailyLimit })) });
    } catch (e) {
      console.log(String(e));
      return json({ ok: false, error: "upstream_error" }, 502);
    }
  }

  /**
   * 4.6: キー確認画面からの設定変更。本文の session（署名付き・30 分）に含まれるリポジトリだけ変えられる。
   * クッキーを使わないので CSRF の心配がない。同じオリジンからだけ受け付ける。
   */
  async function apiSettings(req: Request, env: Env): Promise<Response> {
    const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
    if (req.headers.get("origin") !== new URL(req.url).origin) return json({ ok: false, error: "forbidden" }, 403);
    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    if (!(await env.RL_IP.limit({ key: `settings:${ip}` })).success) return json({ ok: false, error: "rate_limited" }, 429);
    const text = await req.text();
    if (text.length > 4000) return json({ ok: false, error: "invalid_input" }, 400);
    let b: { session?: unknown; repo?: unknown; allowedOrigins?: unknown; dailyLimit?: unknown };
    try { b = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_input" }, 400); }
    const repos = await verifySession(env.SESSION_SECRET, b.session);
    if (!repos) return json({ ok: false, error: "session_expired" }, 401);
    if (typeof b.repo !== "string" || !repos.includes(b.repo)) return json({ ok: false, error: "forbidden" }, 403);
    const allowed = normalizeOrigins(b.allowedOrigins);
    const limit = normalizeDailyLimit(b.dailyLimit);
    if (!allowed || limit === undefined) return json({ ok: false, error: "invalid_input" }, 400);
    const r = await env.DB.prepare("UPDATE projects SET allowed_origins = ?, daily_limit = ? WHERE repo = ? AND banned = 0")
      .bind(allowed.join(","), limit, b.repo).run();
    if (!r.meta.changes) return json({ ok: false, error: "forbidden" }, 403);
    return json({ ok: true, allowedOrigins: allowed, dailyLimit: limit });
  }

  /** GitHub の認可画面へ送る。state = ランダム値.対象 を、同じ値の短命クッキーと組にする。 */
  function startAuth(env: Env, target: string) {
    const state = `${crypto.randomUUID().replace(/-/g, "")}.${target}`;
    const auth = new URL("https://github.com/login/oauth/authorize");
    auth.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
    auth.searchParams.set("state", state);
    return new Response(null, {
      status: 302,
      headers: {
        location: auth.toString(),
        "set-cookie": `pi_state=${state}; Path=/setup; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
        "cache-control": "no-store",
      },
    });
  }

  /** 7.4: 有効なキーがあれば再利用、停止中なら新しいキーに置き換える。運営が止めたものは復活させない。 */
  async function ensureProject(env: Env, id: number, repo: string): Promise<KeyRow> {
    const cur = await env.DB.prepare("SELECT key, active, banned, allowed_origins, daily_limit FROM projects WHERE repo = ?").bind(repo)
      .first<{ key: string; active: number; banned: number; allowed_origins: string; daily_limit: number | null }>();
    if (cur?.banned) return { repo, key: null, origins: [], dailyLimit: null };
    if (!cur || !cur.active) {
      const key = newKey();
      await env.DB.prepare(
        "INSERT INTO projects (key, installation_id, repo) VALUES (?, ?, ?) ON CONFLICT (repo) DO UPDATE SET key = excluded.key, installation_id = excluded.installation_id, active = 1",
      ).bind(key, id, repo).run();
      return { repo, key, origins: cur ? splitOrigins(cur.allowed_origins) : [], dailyLimit: cur?.daily_limit ?? null };
    }
    await env.DB.prepare("UPDATE projects SET installation_id = ? WHERE repo = ?").bind(id, repo).run();
    return { repo, key: cur.key, origins: splitOrigins(cur.allowed_origins), dailyLimit: cur.daily_limit };
  }


  async function webhook(req: Request, env: Env) {
    const body = await req.text();
    if (!(await verifyWebhook(env.GITHUB_WEBHOOK_SECRET, body, req.headers.get("x-hub-signature-256")))) {
      return new Response("bad signature", { status: 401 });
    }
    const ev = req.headers.get("x-github-event");
    const p = JSON.parse(body);
    if (ev === "installation" && p.action === "deleted") {
      await env.DB.prepare("UPDATE projects SET active = 0 WHERE installation_id = ?").bind(p.installation.id).run();
    } else if (ev === "installation_repositories" && p.action === "removed") {
      for (const r of p.repositories_removed ?? []) {
        await env.DB.prepare("UPDATE projects SET active = 0 WHERE repo = ?").bind(r.full_name).run();
      }
    }
    return new Response("ok");
  }

  const creds = (env: Env): GitHubCreds => ({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY });

  return {
    async fetch(req, env) {
      const url = new URL(req.url);
      const path = url.pathname;

      if (path === "/api/report") {
        const cors = corsFor(req);
        if (req.method === "OPTIONS") {
          const h = new Headers({ "access-control-allow-methods": "POST", "access-control-allow-headers": "content-type", "access-control-max-age": "86400" });
          cors(h);
          return new Response(null, { status: 204, headers: h });
        }
        if (req.method === "POST") return report(req, env, cors);
      }

      if (req.method === "GET" && (path === "/icon.svg" || path === "/favicon.ico")) {
        return new Response(ICON_SVG, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });
      }

      if (req.method === "GET" && path === "/widget.js") {
        return new Response(WIDGET_JS, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=300" } });
      }

      const m = path.match(/^\/r\/(pk_[A-Za-z0-9]{24})$/);
      if (req.method === "GET" && m) {
        const p = await getProject(env, m[1]);
        if (!p) return html(messagePage("Not found", "<p>Unknown project.</p>"), {}, 404);
        const meta: Record<string, string> = {};
        let shown = forms;
        let lang: "ja" | "en" | undefined;
        for (const [k, v] of url.searchParams) {
          if (k === "lang") {
            if (v === "ja" || v === "en") lang = v;
          } else if (k === "kinds") {
            const ks = v.split(",");
            const picked = forms.filter((t) => ks.includes(t.kind));
            if (picked.length) shown = picked;
          } else if (Object.keys(meta).length < 18 && /^[A-Za-z0-9_-]{1,50}$/.test(k)) meta[k] = v.slice(0, 200); // 18 + userAgent/language = 20
        }
        const nonce = crypto.randomUUID().replace(/-/g, "");
        const allowed = origins(p);
        const csp = [
          "default-src 'none'", `script-src 'nonce-${nonce}' https://challenges.cloudflare.com`,
          "frame-src https://challenges.cloudflare.com", "connect-src 'self'", "style-src 'unsafe-inline'",
          // 許可リストがあれば、埋め込めるサイトをそこに限る（Origin チェックの実体）
          `frame-ancestors ${allowed.length ? allowed.join(" ") : "*"}`,
        ].join("; ");
        return html(formPage({ projectKey: p.key, repo: p.repo, siteKey: env.TURNSTILE_SITE_KEY, forms: shown, meta, nonce, lang }), {
          "content-security-policy": csp, "referrer-policy": "no-referrer",
        });
      }

      if (req.method === "GET" && path === "/setup") return setup(req, url, env);
      // あとからキーを確認するページ。GitHub の認可画面へ送り、戻り先の /setup で一覧を出す
      if (req.method === "GET" && path === "/keys") return startAuth(env, "keys");
      if (req.method === "GET" && path === "/api/keys") return apiKeys(req, env);
      if (req.method === "POST" && path === "/api/settings") return apiSettings(req, env);
      if (req.method === "POST" && path === "/webhook") return webhook(req, env);
      if (req.method === "GET" && path === "/") {
        const nonce = crypto.randomUUID().replace(/-/g, "");
        return html(landingPage({
          origin: url.origin, appSlug: env.GITHUB_APP_SLUG, demoKey: env.DEMO_KEY, nonce,
          repoUrl: "https://github.com/ninjin0802/posissue",
        }), {
          "content-security-policy": `default-src 'none'; script-src 'self' 'nonce-${nonce}'; style-src 'unsafe-inline'; frame-src 'self'; connect-src 'self'; img-src 'self'`,
        });
      }
      return new Response("Not found", { status: 404 });
    },
  };
}
