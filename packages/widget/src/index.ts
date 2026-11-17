// 仕様: docs/spec/03-packages.html 3.2, 08-widget-ui.html 8.1
export type { ReportKind } from "@posissue/core";
import type { ReportKind } from "@posissue/core";

export const DEFAULT_ENDPOINT = "https://posissue.2nj.lol";

export interface WidgetConfig {
  projectKey: string;
  endpoint?: string;
  kinds?: ReportKind[];
  position?: "bottom-right" | "bottom-left";
  label?: string;
  lang?: "ja" | "en"; // 省略時はブラウザの言語。フォーム上でも切り替えられる
  meta?: Record<string, string>;
}

export interface WidgetHandle { open(): void; close(): void; destroy(): void }

export function init(cfg: WidgetConfig): WidgetHandle {
  return mount({ ...cfg, endpoint: cfg.endpoint ?? DEFAULT_ENDPOINT });
}

/**
 * ウィジェット本体。サーバーが toString() して /widget.js として配信するので、
 * この関数の外（import や他の関数）を参照してはいけない。
 */
export function mount(cfg: WidgetConfig & { endpoint: string }): WidgetHandle {
  const origin = new URL(cfg.endpoint).origin;
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  const side = cfg.position === "bottom-left" ? "left" : "right";
  root.innerHTML = `<style>
button.fab{position:fixed;bottom:20px;${side}:20px;z-index:2147483646;padding:10px 16px;border:0;border-radius:999px;background:#5b5bd6;color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 4px 16px rgba(91,91,214,.35);cursor:pointer}
.back{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center}
.back.on{display:flex}.box{position:relative;width:min(480px,calc(100vw - 32px));height:min(680px,calc(100vh - 32px));background:#f7f7fb;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){.box{background:#0e0e14}}
iframe{border:0;width:100%;height:100%}.x{position:absolute;top:6px;right:8px;border:0;background:none;font-size:22px;cursor:pointer;color:#888}
</style><button class="fab" type="button"></button>
<div class="back" role="dialog" aria-modal="true" aria-label="Feedback"><div class="box"><button class="x" type="button" aria-label="Close">×</button></div></div>`;
  const fab = root.querySelector<HTMLButtonElement>(".fab")!;
  const back = root.querySelector<HTMLDivElement>(".back")!;
  const box = root.querySelector<HTMLDivElement>(".box")!;
  fab.textContent = cfg.label ?? ((cfg.lang ?? navigator.language ?? "").startsWith("ja") ? "フィードバック" : "Feedback");
  fab.setAttribute("aria-label", fab.textContent);
  let frame: HTMLIFrameElement | null = null;

  const open = () => {
    if (!frame) {
      const q = new URLSearchParams({
        ...(cfg.meta ?? {}),
        page: location.origin + location.pathname,
        viewport: `${innerWidth}x${innerHeight}`,
      });
      if (cfg.kinds?.length) q.set("kinds", cfg.kinds.join(","));
      if (cfg.lang) q.set("lang", cfg.lang);
      frame = document.createElement("iframe");
      frame.title = "Feedback";
      frame.src = `${origin}/r/${encodeURIComponent(cfg.projectKey)}?${q}`;
      box.appendChild(frame);
    }
    back.classList.add("on");
    frame.focus();
  };
  const close = () => { back.classList.remove("on"); fab.focus(); };
  const onMsg = (e: MessageEvent) => {
    if (e.origin !== origin || e.source !== frame?.contentWindow) return;
    if (e.data?.type === "posissue:close") close();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && back.classList.contains("on")) close(); };
  fab.addEventListener("click", open);
  root.querySelector(".x")!.addEventListener("click", close);
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  addEventListener("message", onMsg);
  addEventListener("keydown", onKey);
  document.body.appendChild(host);
  return {
    open, close,
    destroy() { removeEventListener("message", onMsg); removeEventListener("keydown", onKey); host.remove(); },
  };
}
