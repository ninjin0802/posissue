// 仕様: docs/spec/04-http-api.html 4.6（作者の設定変更）
// キー確認画面に埋め込む短命の署名付きトークン。中身は「このユーザーが触ってよいリポジトリ」と期限だけ。
// クッキーではなくリクエスト本文で送るので CSRF の対象にならない。
const enc = new TextEncoder();
const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const hmacKey = (secret: string, use: ("sign" | "verify")[]) =>
  crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, use);

export const SESSION_TTL_SEC = 15 * 60;

/** 変更してよいリポジトリと、そのときのインストール ID の組 */
export type Grant = [repo: string, installationId: number];

export async function signSession(secret: string, repos: Grant[], now = Math.floor(Date.now() / 1000)) {
  const body = b64url(enc.encode(JSON.stringify({ r: repos, e: now + SESSION_TTL_SEC })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret, ["sign"]), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** 署名と期限が正しければ、触ってよいリポジトリとインストール ID の組の一覧。そうでなければ null。 */
export async function verifySession(secret: string, token: unknown, now = Math.floor(Date.now() / 1000)): Promise<Grant[] | null> {
  if (typeof token !== "string" || token.length > 8000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret, ["verify"]), unb64url(sig), enc.encode(body));
    if (!ok) return null;
    const d = JSON.parse(new TextDecoder().decode(unb64url(body))) as { r: unknown; e: unknown };
    if (typeof d.e !== "number" || d.e < now || !Array.isArray(d.r)) return null;
    return d.r.filter((x): x is Grant => Array.isArray(x) && typeof x[0] === "string" && typeof x[1] === "number");
  } catch { return null; }
}

export const MAX_ORIGINS = 10;
export const DAILY_LIMIT_MAX = 1000;

/** 「埋め込みを許すサイト」の入力を検証して正規化する。不正なものが 1 つでもあれば null。 */
export function normalizeOrigins(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length > MAX_ORIGINS) return null;
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") return null;
    const s = raw.trim();
    if (!s) continue;
    let u: URL;
    try { u = new URL(s); } catch { return null; }
    // CSP の frame-ancestors にそのまま入るので、オリジン（スキーム + ホスト + ポート）だけを許す
    if ((u.protocol !== "https:" && u.protocol !== "http:") || u.username || u.password) return null;
    if (u.pathname !== "/" || u.search || u.hash || s.replace(/\/$/, "") !== u.origin) return null;
    if (!out.includes(u.origin)) out.push(u.origin);
  }
  return out;
}

/** 1 日の上限。null は既定値に戻す。 */
export function normalizeDailyLimit(input: unknown): number | null | undefined {
  if (input === null) return null;
  if (typeof input !== "number" || !Number.isInteger(input) || input < 1 || input > DAILY_LIMIT_MAX) return undefined;
  return input;
}
