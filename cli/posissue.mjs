#!/usr/bin/env node
// PosIssue CLI（依存なし、Node 18+）。仕様: docs/spec/04-http-api.html 4.5
//   npx posissue keys          自分のリポジトリの projectKey を表示
//   npx posissue keys --json   JSON で出す（AI・スクリプト向け）
// GitHub へのログインは、表示される URL とコードを使って「人が」ブラウザで行う。トークンはどこにも保存しない。
const CLIENT_ID = "Iv23liLH0ndBpU6iA84X"; // 公開の値（GitHub App の Client ID）
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const endpoint = (opt("--endpoint") ?? process.env.POSISSUE_ENDPOINT ?? "https://posissue.2nj.lol").replace(/\/$/, "");
const asJson = flag("--json");
const log = (...m) => console.error(...m); // 案内は stderr、結果だけ stdout（--json をパイプできるように）

async function post(url, body) {
  const res = await fetch(url, { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

async function login() {
  const d = await post("https://github.com/login/device/code", { client_id: CLIENT_ID });
  if (!d.device_code) throw new Error(`GitHub のデバイスフローを開始できません: ${d.error_description ?? d.error ?? "unknown"}`);
  log(`\n  1. ブラウザで ${d.verification_uri} を開いてください`);
  log(`  2. コード ${d.user_code} を入力し、posissue を許可してください\n`);
  log("  （ログインはあなた自身がブラウザで行います。待っています…）");
  let wait = (d.interval ?? 5) * 1000;
  const until = Date.now() + d.expires_in * 1000;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, wait));
    const t = await post("https://github.com/login/oauth/access_token", {
      client_id: CLIENT_ID, device_code: d.device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
    if (t.access_token) return t.access_token;
    if (t.error === "slow_down") wait += 5000;
    else if (t.error !== "authorization_pending") throw new Error(`ログインできませんでした: ${t.error_description ?? t.error}`);
  }
  throw new Error("時間切れです。もう一度実行してください。");
}

async function keys() {
  const token = await login();
  const res = await fetch(`${endpoint}/api/keys`, { headers: { authorization: `Bearer ${token}` } });
  const r = await res.json();
  if (!r.ok) throw new Error(`キーを取得できませんでした: ${r.error}`);
  if (asJson) { console.log(JSON.stringify(r, null, 2)); return; }
  if (!r.keys.length) { log(`\nPosIssue を入れたリポジトリがありません。https://github.com/apps/posissue/installations/new からインストールしてください。`); return; }
  log("");
  for (const k of r.keys) console.log(k.stopped ? `${k.repo}\t(停止中)` : `${k.repo}\t${k.key}`);
  const first = r.keys.find((k) => !k.stopped);
  if (first) log(`\nサイトに貼る例:\n  <script src="${r.endpoint}/widget.js" data-key="${first.key}" async></script>`);
}

const cmd = args.find((a) => !a.startsWith("--") && a !== opt("--endpoint"));
if (cmd === "keys") {
  keys().catch((e) => { log(`\nエラー: ${e.message}`); process.exit(1); });
} else {
  log(`使い方:
  posissue keys [--json] [--endpoint URL]   GitHub でログインして、自分のリポジトリの projectKey を表示`);
  process.exit(cmd ? 1 : 0);
}
