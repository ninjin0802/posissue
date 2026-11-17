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

/**
 * OAuth の code をユーザートークンに換え、そのユーザーがこのインストールにアクセスできるか確かめる。
 * /user/installations はユーザーが入れた（または権限を持つ）この App のインストールだけを返す。
 */
export async function userOwnsInstallation(clientId: string, clientSecret: string, code: string, id: number) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "user-agent": "posissue" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const tok = (await res.json()) as { access_token?: string };
  if (!tok.access_token) return false;
  // shortcut: 先頭 100 件のみ確認。1 ユーザーが 100 を超えるインストールを持つならページングを足す
  const r = await gh(`/user/installations?per_page=100`, tok.access_token);
  return (r.installations as { id: number }[]).some((x) => x.id === id);
}

export async function listInstallationRepos(c: GitHubCreds, id: number): Promise<string[]> {
  // shortcut: 先頭 100 件のみ取得。1 インストールで 100 リポジトリを超えたらページングを足す
  const r = await gh(`/installation/repositories?per_page=100`, await installationToken(c, id));
  return r.repositories.map((x: { full_name: string }) => x.full_name);
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
