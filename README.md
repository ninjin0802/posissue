# PosIssue

GitHub アカウントがなくても、サイトやアプリから OSS リポジトリへバグ報告・要望を Issue として送れるウィジェットフレームワークです。Cloudflare Workers で動きます。

> 状態: v1 開発中（未リリース）

## 使い方

**サイトに置く**
```html
<script src="https://<endpoint>/widget.js" data-key="pk_xxx" async></script>
```

**npm から**
```ts
import { init } from "posissue";
init({ projectKey: "pk_xxx", endpoint: "https://<endpoint>" });
```

**アプリから**: `https://<endpoint>/r/pk_xxx?app_version=1.2.0&os=ios` を WebView で開きます。

**フォームを型で決める（セルフホスト）**
```ts
import { createHandler } from "@posissue/server";
export default createHandler({
  forms: [{ kind: "bug", label: { en: "Bug", ja: "バグ報告" },
    fields: [{ id: "steps", type: "textarea", required: true, label: { en: "Steps", ja: "再現手順" } }] }],
});
```

厳しい CSP のサイトでは `script-src` と `frame-src` に `<endpoint>` を追加してください。

## 構成

| パス | 内容 |
|---|---|
| `packages/core` | 型・検証・Issue 本文の組み立て |
| `packages/server` | Cloudflare Workers 用ハンドラ |
| `packages/widget` | ブラウザ用ウィジェット |
| `apps/hosted` | 公式ホスト |
| `docs/spec/` | 仕様書（SSOT）。`docs/spec/index.html` をブラウザで開く |

## 開発

```sh
npm install
npm test
npm run typecheck
```

デプロイ手順は仕様書 9 章を参照してください。

## License

MIT
