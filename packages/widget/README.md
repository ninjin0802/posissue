# posissue

A feedback widget that lets **anyone** send bug reports and feature requests to your GitHub repository as issues — **no GitHub account needed**.

- Website: https://posissue.2nj.lol
- Source & docs: https://github.com/ninjin0802/posissue

## 1. Get a project key

Install the [GitHub App](https://github.com/apps/posissue/installations/new) on your repository, then copy your key (`pk_...`) from the [dashboard](https://posissue.2nj.lol/admin) — or from the terminal:

```sh
npx posissue keys
```

The CLI prints a URL and a one-time code. You sign in to GitHub yourself in the browser.

## 2. Add the widget

```sh
npm i posissue
```

```ts
import { init } from "posissue";

const widget = init({
  projectKey: "pk_xxx",
  lang: "en",                 // "ja" | "en" (default: browser language)
  position: "bottom-right",   // or "bottom-left"
  meta: { appVersion: "1.2.0" },
});

widget.open();    // open the form from your own button
widget.destroy(); // remove it
```

Use your own button instead of the floating one:

```ts
const widget = init({ projectKey: "pk_xxx", button: false, color: "#e91e63" });
document.querySelector("#feedback")!.addEventListener("click", () => widget.open());
```

Prefer no build step? Use the script tag (every option has a `data-` attribute):

```html
<script src="https://posissue.2nj.lol/widget.js" data-key="pk_xxx"
  data-position="bottom-left" data-offset="24,80" data-variant="icon" data-color="#e91e63" async></script>
```

With `data-button="false"`, open it from your own button with `window.PosIssue.open()`.

In apps, add `color=e91e63` to the form URL to match your brand color.

## Options

| Option | Type | Description |
|---|---|---|
| `projectKey` | `string` | Your project key (required) |
| `endpoint` | `string` | Self-hosted server URL (default: `https://posissue.2nj.lol`) |
| `lang` | `"ja" \| "en"` | Form language |
| `kinds` | `("bug" \| "feature" \| "other")[]` | Report types to show |
| `position` | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"` | Button corner |
| `offset` | `number \| { x?: number; y?: number }` | Distance from the edges in px (default 20) |
| `button` | `boolean` | `false` hides the floating button — open the form from your own UI with `open()` |
| `variant` | `"pill" \| "icon"` | Text button (default) or a round icon button |
| `color` | `string` | Accent color `#rrggbb` for the button and the form |
| `zIndex` | `number` | Stacking order if it overlaps other floating elements |
| `label` | `string` | Button text |
| `meta` | `Record<string, string>` | Extra info attached to the issue |

With a strict CSP, allow `https://posissue.2nj.lol` in `script-src` and `frame-src`.

## License

MIT
