// 仕様: docs/spec/04-http-api.html, 05-data-model.html, 07-spam-security.html
import {
  assertForms, buildIssue, DEFAULT_FORMS, parseReportRequest, reportUrls,
  type ErrorCode, type FormTemplate, type ReportResponse,
} from "@posissue/core";
import { mount } from "posissue";
import { createIssue, getInstallation, listInstallationRepos, verifyWebhook, type GitHubCreds } from "./github";
import { esc, formPage, ICON_SVG, landingPage, messagePage } from "./pages";

export type { ReportRequest, ReportResponse, ErrorCode, FormTemplate, FormField } from "@posissue/core";
export { DEFAULT_FORMS } from "@posissue/core";

export interface Env {
  DB: D1Database;
  RL_IP: RateLimit;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_APP_SLUG: string;
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

const STATUS: Record<ErrorCode, number> = {
  invalid_input: 400, captcha_failed: 403, forbidden_origin: 403, unknown_project: 404,
  duplicate: 409, spam: 422, rate_limited: 429, upstream_error: 502,
};

const WIDGET_JS =
  // wrangler(esbuild) の keepNames が関数本体に __name(...) を差し込むので、toString した先でも動くよう同名の素通し関数を置く
  `(function(){var __name=function(f){return f};var s=document.currentScript;if(!s)return;var mount=${mount.toString()};` +
  `var go=function(){mount({projectKey:s.dataset.key,endpoint:new URL(s.src).origin,position:s.dataset.position,label:s.dataset.label,lang:s.dataset.lang,` +
  `kinds:s.dataset.kinds?s.dataset.kinds.split(","):undefined})};document.body?go():addEventListener("DOMContentLoaded",go)})();`;

const html = (body: string, headers: Record<string, string> = {}, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...headers } });

const newKey = () => {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return "pk_" + Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => a[b % a.length]).join("");
};

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

const origins = (p: Project) => p.allowed_origins.split(",").map((s) => s.trim()).filter(Boolean);

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
    const r = parseReportRequest(await req.json().catch(() => null), forms);
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
      .then((x) => x.json<{ success: boolean }>()).catch(() => ({ success: false }));
    if (!ts.success) return fail("captcha_failed", p.key);

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

  async function setup(url: URL, env: Env) {
    const id = Number(url.searchParams.get("installation_id"));
    if (!Number.isInteger(id) || id <= 0) return html(messagePage("Error", "<p>installation_id がありません。</p>"), {}, 400);
    try { await getInstallation(creds(env), id); } catch {
      return html(messagePage("Error", "<p>この App のインストールではありません。</p>"), {}, 404);
    }
    const repos = await listInstallationRepos(creds(env), id);
    const rows: string[] = [];
    for (const repo of repos) {
      // 7.4: 有効なキーがあれば再利用、停止中なら新しいキーに置き換える
      const cur = await env.DB.prepare("SELECT key, active, banned FROM projects WHERE repo = ?").bind(repo).first<{ key: string; active: number; banned: number }>();
      // 7.4: 運営が止めたリポジトリは /setup から復活させない（/setup は誰でも呼べるため）
      if (cur?.banned) { rows.push(`<tr><td>${esc(repo)}</td><td>停止中</td></tr>`); continue; }
      let key = cur?.key;
      if (!cur || !cur.active) {
        key = newKey();
        await env.DB.prepare(
          "INSERT INTO projects (key, installation_id, repo) VALUES (?, ?, ?) ON CONFLICT (repo) DO UPDATE SET key = excluded.key, installation_id = excluded.installation_id, active = 1",
        ).bind(key, id, repo).run();
      } else {
        await env.DB.prepare("UPDATE projects SET installation_id = ? WHERE repo = ?").bind(id, repo).run();
      }
      rows.push(`<tr><td>${esc(repo)}</td><td><code>${esc(key!)}</code></td></tr>`);
    }
    const origin = url.origin;
    return html(messagePage("PosIssue のセットアップ完了", `<table><tr><th>リポジトリ</th><th>projectKey</th></tr>${rows.join("")}</table>
<p>サイトに貼り付け:</p><pre><code>${esc(`<script src="${origin}/widget.js" data-key="pk_..." async></script>`)}</code></pre>
<p>アプリからは <code>${esc(origin)}/r/pk_...</code> を WebView で開いてください。</p>`));
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

      if (req.method === "GET" && path === "/setup") return setup(url, env);
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
