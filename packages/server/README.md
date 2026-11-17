# @posissue/server

Self-host [PosIssue](https://posissue.2nj.lol) on **Cloudflare Workers**: a beautiful feedback form, a spam-protected API, a maintainer dashboard and approval mode — reports become GitHub issues, and reporters don’t need a GitHub account.

> Prefer not to run anything? Use the free hosted service at https://posissue.2nj.lol.

## Install

```sh
npm i @posissue/server
```

```ts
// src/index.ts
import { createHandler, type FormTemplate } from "@posissue/server";

const forms: FormTemplate[] = [
  {
    kind: "bug",
    label: { en: "Bug", ja: "バグ報告" },
    fields: [
      { id: "steps", type: "textarea", required: true, label: { en: "Steps to reproduce", ja: "再現手順" } },
      { id: "actual", type: "textarea", required: true, label: { en: "What happened", ja: "実際に起きたこと" } },
    ],
  },
];

export default createHandler({ forms, labels: ["from-widget"], limits: { projectPerDay: 50 } });
```

Omit `forms` to use the built-in Bug / Feature request / Other forms. Mistakes in the form type throw at startup.

## Bindings and secrets (wrangler)

| Name | Kind | Purpose |
|---|---|---|
| `DB` | D1 | Projects, pending reports, counters (apply the migrations from the repo’s `apps/hosted/migrations`) |
| `RL_IP` | Rate limit | Reports per IP (e.g. 2 / 60s) |
| `RL_ADMIN` | Rate limit | Maintainer actions per IP (e.g. 30 / 60s) |
| `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` | Secret | Your GitHub App (PKCS#8 key) |
| `GITHUB_APP_SLUG`, `GITHUB_CLIENT_ID` | Var | App slug and OAuth client ID |
| `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET` | Secret | OAuth and webhook |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET` | Var / Secret | Cloudflare Turnstile |
| `SESSION_SECRET` | Secret | Signs dashboard actions |

A complete example lives in [`apps/hosted`](https://github.com/ninjin0802/posissue/tree/main/apps/hosted), and the full spec in [`docs/spec`](https://github.com/ninjin0802/posissue/tree/main/docs/spec).

This package ships ES modules for bundlers (wrangler/esbuild); it is not meant to run directly in Node.js.

MIT · https://github.com/ninjin0802/posissue
