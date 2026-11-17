# @posissue/core

Shared types, validation and issue rendering for [PosIssue](https://posissue.2nj.lol) — a feedback widget that lets anyone send GitHub issues without a GitHub account.

You usually don’t need this package directly. Use [`posissue`](https://www.npmjs.com/package/posissue) for the widget, or [`@posissue/server`](https://www.npmjs.com/package/@posissue/server) to self-host.

```ts
import { DEFAULT_FORMS, parseReportRequest, buildIssue, type FormTemplate } from "@posissue/core";
```

- `FormTemplate` / `FormField` — the typed form definition (one type → UI, validation and issue body)
- `parseReportRequest(input, forms)` — validate an untrusted report against the form type
- `buildIssue(report, forms, labels)` — render a safe issue (mentions and links neutralized)

MIT · https://github.com/ninjin0802/posissue
