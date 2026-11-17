// 仕様: docs/spec/03-packages.html 3.3, 08-widget-ui.html 8.1
// npm で単体配布するため、ほかのパッケージに依存しない（@posissue/core の ReportKind と同じ型）
export type ReportKind = "bug" | "feature" | "other";

export const DEFAULT_ENDPOINT = "https://posissue.2nj.lol";

export type WidgetPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface WidgetConfig {
  projectKey: string;
  endpoint?: string;
  kinds?: ReportKind[];
  /** ボタンを置く隅（既定 bottom-right） */
  position?: WidgetPosition;
  /** 端からの距離（px）。数値なら縦横同じ。既定 20 */
  offset?: number | { x?: number; y?: number };
  /** false にすると浮いたボタンを出さない。自分のボタンから open() で開く */
  button?: boolean;
  /** "pill"（文字付き、既定）か "icon"（丸いアイコンだけ） */
  variant?: "pill" | "icon";
  /** アクセント色（#rrggbb）。ボタンとフォームに使う */
  color?: string;
  label?: string;
  lang?: "ja" | "en"; // 省略時はブラウザの言語。フォーム上でも切り替えられる
  /** 重なり順。ほかの浮いた要素と重なるときに調整する */
  zIndex?: number;
  meta?: Record<string, string>;
  /** 入力の先埋め。種別・タイトル・項目（id → 値） */
  prefill?: Prefill;
  /** 送信が終わったとき。承認モードでは pending: true（issueNumber はない） */
  onSubmit?: (result: SubmitResult) => void;
  /** フォームを閉じたとき */
  onClose?: () => void;
}

export interface Prefill { kind?: ReportKind; title?: string; fields?: Record<string, string> }
export interface SubmitResult { kind?: ReportKind; issueNumber?: number; issueUrl?: string; pending?: boolean }

export interface WidgetHandle {
  /** フォームを開く。prefill を渡すと、その内容を入れた状態で開き直す */
  open(options?: { prefill?: Prefill }): void;
  close(): void;
  destroy(): void;
}

export function init(cfg: WidgetConfig): WidgetHandle {
  return mount({ ...cfg, endpoint: cfg.endpoint ?? DEFAULT_ENDPOINT });
}

/**
 * ウィジェット本体。サーバーが toString() して /widget.js として配信するので、
 * この関数の外（import や他の関数）を参照してはいけない。
 */
export function mount(cfg: WidgetConfig & { endpoint: string }): WidgetHandle {
  const origin = new URL(cfg.endpoint).origin;
  // 入力はページの作者が書くものだが、CSS に入れるので形を確かめてから使う
  const hex = /^#?([0-9a-fA-F]{6})$/.exec(cfg.color ?? "")?.[1];
  const color = hex ? `#${hex}` : "#5b5bd6";
  const pos = ["bottom-right", "bottom-left", "top-right", "top-left"].indexOf(cfg.position ?? "") >= 0 ? cfg.position! : "bottom-right";
  const [vy, vx] = pos.split("-");
  const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) && v >= 0 && v <= 400 ? Math.round(v) : d);
  const ox = num(typeof cfg.offset === "object" ? cfg.offset.x : cfg.offset, 20);
  const oy = num(typeof cfg.offset === "object" ? cfg.offset.y : cfg.offset, 20);
  const z = typeof cfg.zIndex === "number" && isFinite(cfg.zIndex) ? Math.round(Math.min(cfg.zIndex, 2147483646)) : 2147483646;
  const icon = cfg.variant === "icon";
  // 明るい色なら文字を黒に（読みやすさ）
  const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
  const fg = (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#16161d" : "#fff";
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
button{-webkit-tap-highlight-color:transparent}
button.fab{position:fixed;${vy}:${oy}px;${vx}:${ox}px;z-index:${z};display:flex;align-items:center;justify-content:center;gap:6px;padding:${icon ? "0" : "10px 16px"};${icon ? "width:52px;height:52px;" : ""}border:0;border-radius:999px;background:${color};color:${fg};font:600 14px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.22);cursor:pointer;transition:transform .15s}
button.fab:hover{transform:translateY(-1px)}button.fab:focus-visible{outline:3px solid ${color};outline-offset:3px}
.back{position:fixed;inset:0;z-index:${Math.min(z + 1, 2147483647)};background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center}
.back.on{display:flex}.box{position:relative;width:min(480px,calc(100vw - 32px));height:min(680px,calc(100vh - 32px));background:#f7f7fb;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){.box{background:#0e0e14}}
iframe{border:0;width:100%;height:100%}.x{position:absolute;top:6px;right:8px;border:0;background:none;font-size:22px;cursor:pointer;color:#888}
@media (prefers-reduced-motion:reduce){button.fab{transition:none}}
</style>${cfg.button === false ? "" : `<button class="fab" type="button"></button>`}
<div class="back" role="dialog" aria-modal="true" aria-label="Feedback"><div class="box"><button class="x" type="button" aria-label="Close">×</button></div></div>`;
  const fab = root.querySelector<HTMLButtonElement>(".fab");
  const back = root.querySelector<HTMLDivElement>(".back")!;
  const box = root.querySelector<HTMLDivElement>(".box")!;
  const text = cfg.label ?? ((cfg.lang ?? navigator.language ?? "").startsWith("ja") ? "フィードバック" : "Feedback");
  if (fab) {
    fab.setAttribute("aria-label", text);
    if (icon) {
      fab.title = text;
      fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    } else {
      fab.textContent = text;
    }
  }
  let frame: HTMLIFrameElement | null = null;
  let opener: Element | null = null;

  const open = (options?: { prefill?: Prefill }) => {
    // 先埋めを変えて開くときは、フォームを作り直す
    if (frame && options?.prefill) { frame.remove(); frame = null; }
    const prefill = options?.prefill ?? cfg.prefill;
    if (!frame) {
      const q = new URLSearchParams({
        ...(cfg.meta ?? {}),
        page: location.origin + location.pathname,
        viewport: `${innerWidth}x${innerHeight}`,
      });
      if (cfg.kinds?.length) q.set("kinds", cfg.kinds.join(","));
      if (cfg.lang) q.set("lang", cfg.lang);
      if (hex) q.set("color", hex);
      if (prefill) q.set("prefill", JSON.stringify(prefill));
      frame = document.createElement("iframe");
      frame.title = "Feedback";
      frame.src = `${origin}/r/${encodeURIComponent(cfg.projectKey)}?${q}`;
      box.appendChild(frame);
    }
    opener = document.activeElement;
    back.classList.add("on");
    frame.focus();
  };
  // 閉じたら、開く前にフォーカスがあった場所（自前のボタンなど）に戻す
  const close = () => {
    if (!back.classList.contains("on")) return;
    back.classList.remove("on");
    if (cfg.onClose) cfg.onClose();
    const el = (fab ?? opener) as HTMLElement | null;
    if (el && typeof el.focus === "function") el.focus();
  };
  const onMsg = (e: MessageEvent) => {
    if (e.origin !== origin || e.source !== frame?.contentWindow) return;
    if (e.data?.type === "posissue:close") close();
    if (e.data?.type === "posissue:done") {
      const result: SubmitResult = { kind: e.data.kind, issueNumber: e.data.issueNumber, issueUrl: e.data.issueUrl, pending: e.data.pending };
      if (cfg.onSubmit) cfg.onSubmit(result);
      // script タグ版でも受け取れるように、ページにもイベントを出す
      dispatchEvent(new CustomEvent("posissue:submit", { detail: result }));
    }
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && back.classList.contains("on")) close(); };
  if (fab) fab.addEventListener("click", () => open());
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
