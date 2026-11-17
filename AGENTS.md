# AGENTS.md

AI コーディングエージェント（Claude Code、Codex、Cursor など）向けの作業ガイドです。人向けの説明は README.md を見てください。
PosIssue を**自分のプロジェクトに導入したい**場合は、このファイルではなく https://posissue.2nj.lol/llms.txt を読んでください。

## 最初に読むもの

- **仕様書が唯一の正（SSOT）**: `docs/spec/`（章ごとの HTML。章の一覧は `docs/spec/nav.js`）。
  実装を変えるときは、先に該当する章を更新する。実装と仕様が食い違ったら仕様に合わせる。

## 構成

| パス | 内容 |
|---|---|
| `packages/core` | 型（`ReportRequest`、`FormTemplate` など）、入力検証、Issue 本文の組み立て、無害化。実行環境に依存しない |
| `packages/server` | Cloudflare Workers 用 `createHandler()`。フォームページ、API、GitHub App 認証、OAuth（/setup・/keys）、Webhook |
| `packages/widget` | ブラウザ用ウィジェット。`mount()` は `toString()` して /widget.js で配るので、関数の外を参照しない |
| `apps/hosted` | 公式ホスト（posissue.2nj.lol）。`wrangler.jsonc`、D1 マイグレーション、静的ファイル `public/` |

## コマンド

```sh
npm install
npm test            # vitest
npm run typecheck   # tsc
cd apps/hosted && npx wrangler dev   # .dev.vars にテスト用の値が必要（Turnstile のテストキーなど）
```

## 守ること

- **main に直接 push しない。** ブランチ → PR → CI（typecheck + test）が通る → マージ → その後に `wrangler deploy`。
- **秘密情報をコードやログに書かない。** App の秘密鍵・client secret・Turnstile secret・Webhook secret は Workers Secrets のみ。
  projectKey（`pk_...`）と Turnstile のサイトキー、OAuth の client id は公開の値。
- **セキュリティの前提を崩さない**（仕様書 7 章）:
  - 検査は安い順（7.1 の順序）。Issue 本文は `neutralize()` を通し、環境情報は `<code>` + 文字参照。
  - /setup・/keys は OAuth の state をクッキーと照合し、ログインしたユーザーがアクセスできるリポジトリだけを表示する。
  - HTML に値を入れるときは `esc()`、ブラウザ側は `textContent`。インラインスクリプトは nonce 付き CSP。
- 報告者の個人情報（IP、メールなど）を保存しない。
- 新しい分岐やパーサーを足したら `packages/*/test` に小さなテストを足す。
- コミットとドキュメントは日本語。

## よくある変更の入口

- フォームの項目を変える: `packages/core/src/index.ts` の `DEFAULT_FORMS`（型は `FormTemplate`）
- フォームの見た目・文言: `packages/server/src/pages.ts` の `formPage()`（文言は `T`、日英）
- 新しいエンドポイント: `packages/server/src/index.ts` の `fetch()` と、仕様書 4 章
- スパム対策の値: `createHandler()` の設定、`apps/hosted/wrangler.jsonc` の `ratelimits`、仕様書 7・9 章
