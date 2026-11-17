// 仕様: docs/spec/06-github-app.html
const API = "https://api.github.com";
const enc = new TextEncoder();
const b64url = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

let keyCache: { pem: string; key: CryptoKey } | undefined;
async function signingKey(pem: string) {
  if (keyCache?.pem === pem) return keyCache.key;
  if (pem.includes("BEGIN RSA PRIVATE KEY")) throw new Error("GITHUB_APP_PRIVATE_KEY must be PKCS#8 (see spec 6.2)");
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  keyCache = { pem, key };
  return key;
}

export async function appJwt(appId: string, pem: string, now = Math.floor(Date.now() / 1000)) {
  const head = b64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await signingKey(pem), enc.encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

export interface GitHubCreds { appId: string; privateKey: string }

async function gh(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`, accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28", "user-agent": "posissue", "content-type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${init.method ?? "GET"} ${path}: ${res.status}`);
  return res.json() as Promise<any>;
}

const tokens = new Map<number, { token: string; exp: number }>();
async function installationToken(c: GitHubCreds, id: number) {
  const hit = tokens.get(id);
  if (hit && hit.exp - Date.now() > 5 * 60_000) return hit.token;
  const r = await gh(`/app/installations/${id}/access_tokens`, await appJwt(c.appId, c.privateKey), { method: "POST" });
  tokens.set(id, { token: r.token, exp: Date.parse(r.expires_at) });
  return r.token as string;
}

/** OAuth の code をユーザートークンに換える。失敗なら null。 */
export async function userToken(clientId: string, clientSecret: string, code: string): Promise<string | null> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "user-agent": "posissue" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  return ((await res.json()) as { access_token?: string }).access_token ?? null;
}

/**
 * トークンが「この App のために発行されたユーザートークン」か GitHub に確かめる（CLI の /api/keys 用）。
 * 他の App のトークンや PAT を受け付けると、別アプリのインストール ID でプロジェクトを作ってしまうため。
 */
export async function isOurUserToken(clientId: string, clientSecret: string, token: string): Promise<boolean> {
  const res = await fetch(`${API}/applications/${clientId}/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, accept: "application/vnd.github+json",
      "content-type": "application/json", "user-agent": "posissue", "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ access_token: token }),
  });
  return res.ok;
}

/** そのユーザーがアクセスできる、この App のインストール ID の一覧。 */
export async function userInstallations(token: string): Promise<number[]> {
  // shortcut: 先頭 100 件のみ。1 ユーザーが 100 を超えるインストールを持つならページングを足す
  const r = await gh(`/user/installations?per_page=100`, token);
  return (r.installations as { id: number }[]).map((x) => x.id);
}

/**
 * インストールのうち「そのユーザー自身が見られるリポジトリ」だけを返す。
 * Organization のメンバーが、自分に権限のないリポジトリ名やキーを見られないようにするため。
 * アクセスできなければ null。
 */
export interface UserRepo { name: string; canAdmin: boolean }
export async function userInstallationRepos(token: string, id: number): Promise<UserRepo[] | null> {
  // shortcut: 先頭 100 件のみ。100 リポジトリを超えたらページングを足す
  const res = await fetch(`${API}/user/installations/${id}/repositories?per_page=100`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "posissue" },
  });
  if (!res.ok) return null; // 404 = そのユーザーはこのインストールにアクセスできない
  const r = (await res.json()) as { repositories: { full_name: string; permissions?: { admin?: boolean; maintain?: boolean } }[] };
  // 設定を変えられるのは、そのリポジトリの管理者（admin / maintain）だけ（4.6）
  return r.repositories.map((x) => ({ name: x.full_name, canAdmin: !!(x.permissions?.admin || x.permissions?.maintain) }));
}

export async function createIssue(
  c: GitHubCreds, id: number, repo: string, issue: { title: string; body: string; labels: string[] },
): Promise<{ number: number; html_url: string }> {
  return gh(`/repos/${repo}/issues`, await installationToken(c, id), { method: "POST", body: JSON.stringify(issue) });
}

export async function verifyWebhook(secret: string, body: string, sigHeader: string | null) {
  if (!sigHeader?.startsWith("sha256=")) return false;
  const hex = sigHeader.slice(7);
  if (!/^[0-9a-f]{64}$/.test(hex)) return false;
  const sig = Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16));
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, sig, enc.encode(body)); // 時間一定の比較
}
