// 仕様: docs/spec/03-packages.html, 06-github-app.html, 07-spam-security.html
export type ReportKind = "bug" | "feature" | "other";
export const REPORT_KINDS: readonly ReportKind[] = ["bug", "feature", "other"];

/** 表示用の文字列。文字列なら全言語共通、オブジェクトなら言語別（en は必須）。 */
export type LocalText = string | { en: string; ja?: string };
export const text = (t: LocalText, lang: "en" | "ja" = "en") => (typeof t === "string" ? t : (lang === "ja" && t.ja) || t.en);

export type FieldType = "text" | "textarea" | "select" | "checkbox";

/** フォームの1項目。Issue 本文では `### label` の見出し付きで並ぶ。 */
export interface FormField {
  id: string;                 // 英数字・_・-、32 文字まで
  type: FieldType;
  label: LocalText;
  placeholder?: LocalText;
  help?: LocalText;
  required?: boolean;
  options?: { value: string; label: LocalText }[]; // select のみ
  maxLength?: number;         // 既定 text=200 / textarea=5000
}

/** 種別ごとのフォームの型。これを渡すだけでフォームと Issue 本文の形が決まる。 */
export interface FormTemplate {
  kind: ReportKind;
  label: LocalText;
  description?: LocalText;
  titlePlaceholder?: LocalText;
  fields: FormField[];
}

export const DEFAULT_FORMS: FormTemplate[] = [
  {
    kind: "bug", label: { en: "Bug", ja: "バグ報告" },
    description: { en: "Something is broken or not working as expected.", ja: "動かない・おかしな動きをする" },
    titlePlaceholder: { en: "e.g. Save button does nothing", ja: "例: 保存ボタンを押しても反応しない" },
    fields: [
      { id: "steps", type: "textarea", required: true, label: { en: "Steps to reproduce", ja: "再現手順" },
        placeholder: { en: "1. Open ...\n2. Click ...", ja: "1. 〇〇を開く\n2. 〇〇を押す" } },
      { id: "expected", type: "textarea", label: { en: "Expected behavior", ja: "期待した動き" } },
      { id: "actual", type: "textarea", required: true, label: { en: "What happened", ja: "実際に起きたこと" } },
    ],
  },
  {
    kind: "feature", label: { en: "Feature request", ja: "機能の要望" },
    description: { en: "An idea to make it better.", ja: "こうなったら嬉しい" },
    titlePlaceholder: { en: "e.g. Export as CSV", ja: "例: CSV で書き出したい" },
    fields: [
      { id: "problem", type: "textarea", required: true, label: { en: "What problem does it solve?", ja: "困っていること" } },
      { id: "proposal", type: "textarea", label: { en: "Your idea", ja: "こうしてほしい" } },
    ],
  },
  {
    kind: "other", label: { en: "Other", ja: "その他" },
    description: { en: "Questions, thanks, anything else.", ja: "質問・感想など" },
    fields: [{ id: "message", type: "textarea", required: true, label: { en: "Message", ja: "内容" } }],
  },
];

export interface ReportInput {
  kind: ReportKind;
  title: string;
  fields: Record<string, string>; // FormField.id → 値（checkbox は "true" / "false"）
  meta?: Record<string, string>;
}

export interface ReportRequest extends ReportInput {
  projectKey: string;
  turnstileToken: string;
  hp?: string;
  elapsedMs: number;
}

export type ErrorCode =
  | "invalid_input" | "unknown_project" | "forbidden_origin"
  | "captcha_failed" | "rate_limited" | "duplicate" | "spam" | "upstream_error";

export type ReportResponse =
  | { ok: true; issueNumber: number; issueUrl: string }
  | { ok: false; error: ErrorCode };

export const LIMITS = { title: 100, body: 5000, metaKeys: 20, metaValue: 200 } as const;
const KEY_RE = /^pk_[A-Za-z0-9]{24}$/;

const str = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

const ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const maxLen = (f: FormField) => f.maxLength ?? (f.type === "textarea" ? LIMITS.body : LIMITS.title);

/** 開発者が渡したフォームの型が正しいか確かめる。間違いは起動時に例外で知らせる。 */
export function assertForms(forms: FormTemplate[]): void {
  const kinds = new Set<string>();
  for (const t of forms) {
    if (!REPORT_KINDS.includes(t.kind) || kinds.has(t.kind)) throw new Error(`invalid or duplicate kind: ${t.kind}`);
    kinds.add(t.kind);
    const ids = new Set<string>();
    for (const f of t.fields) {
      if (!ID_RE.test(f.id) || ids.has(f.id)) throw new Error(`invalid or duplicate field id: ${t.kind}.${f.id}`);
      ids.add(f.id);
      if (f.type === "select" && !f.options?.length) throw new Error(`select needs options: ${t.kind}.${f.id}`);
    }
  }
}

/** 信頼できない入力を、フォームの型に沿って検証する。不正なら null。 */
export function parseReportRequest(v: unknown, forms: FormTemplate[] = DEFAULT_FORMS): ReportRequest | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const tpl = forms.find((t) => t.kind === o.kind);
  if (!tpl || !str(o.title, LIMITS.title)) return null;
  if (!o.fields || typeof o.fields !== "object" || Array.isArray(o.fields)) return null;
  const raw = o.fields as Record<string, unknown>;
  const fields: Record<string, string> = {};
  let total = 0;
  for (const f of tpl.fields) {
    const val = raw[f.id] ?? "";
    if (typeof val !== "string" || val.length > maxLen(f)) return null;
    if (f.required && !val.trim()) return null;
    if (f.type === "select" && val && !f.options!.some((x) => x.value === val)) return null;
    if (f.type === "checkbox" && val && val !== "true" && val !== "false") return null;
    total += val.length;
    fields[f.id] = val;
  }
  if (Object.keys(raw).some((k) => !(k in fields)) || total > LIMITS.body) return null;
  if (typeof o.projectKey !== "string" || !KEY_RE.test(o.projectKey)) return null;
  if (typeof o.turnstileToken !== "string" || typeof o.elapsedMs !== "number") return null;
  if (o.hp !== undefined && typeof o.hp !== "string") return null;
  let meta: Record<string, string> | undefined;
  if (o.meta !== undefined) {
    if (!o.meta || typeof o.meta !== "object" || Array.isArray(o.meta)) return null;
    const entries = Object.entries(o.meta);
    if (entries.length > LIMITS.metaKeys) return null;
    for (const [k, val] of entries) {
      if (k.length > 50 || typeof val !== "string" || val.length > LIMITS.metaValue) return null;
    }
    meta = Object.fromEntries(entries) as Record<string, string>;
  }
  return {
    kind: tpl.kind, title: o.title.trim(), fields, meta,
    projectKey: o.projectKey, turnstileToken: o.turnstileToken, hp: o.hp as string | undefined,
    elapsedMs: o.elapsedMs,
  };
}

/** レポート全体の URL 数（スパム判定 7.1 #4）。 */
export const reportUrls = (r: ReportInput) =>
  countUrls(r.title) + Object.values(r.fields).reduce((n, v) => n + countUrls(v), 0);

export const countUrls = (s: string) => (s.match(/https?:\/\/|www\./gi) ?? []).length;

const ZWSP = "​";
/** @メンションと #番号 の通知を無効化する（7.2）。 */
export const neutralize = (s: string) =>
  s.replace(/@(?=[A-Za-z0-9-])/g, "@" + ZWSP).replace(/#(?=\d)/g, "#" + ZWSP);

const cell = (s: string) =>
  neutralize(s).replace(/[|`\\]/g, (c) => "\\" + c).replace(/\r?\n/g, " ");

const PREFIX: Record<ReportKind, string> = { bug: "[Bug]", feature: "[Feature]", other: "[Feedback]" };
const KIND_LABEL: Record<ReportKind, string> = { bug: "bug", feature: "enhancement", other: "feedback" };

export function buildIssue(r: ReportInput, forms: FormTemplate[] = DEFAULT_FORMS, extraLabels: string[] = []) {
  const tpl = forms.find((t) => t.kind === r.kind)!;
  const sections = tpl.fields
    .filter((f) => r.fields[f.id]?.trim())
    .map((f) => {
      const v = r.fields[f.id];
      const shown = f.type === "checkbox" ? (v === "true" ? "Yes" : "No")
        : f.type === "select" ? text(f.options!.find((o) => o.value === v)!.label) : v;
      return `### ${neutralize(text(f.label))}\n\n${neutralize(shown)}`;
    }).join("\n\n");
  const meta = Object.entries(r.meta ?? {});
  const table = meta.length
    ? `\n\n---\n<details><summary>Environment</summary>\n\n| key | value |\n|---|---|\n${meta
        .map(([k, v]) => `| ${cell(k)} | ${cell(v)} |`).join("\n")}\n</details>`
    : "\n\n---";
  return {
    title: `${PREFIX[r.kind]} ${neutralize(r.title)}`,
    body: `${sections}${table}\n\n_PosIssue ウィジェットから送信されました_`,
    labels: [...new Set(["via-widget", KIND_LABEL[r.kind], ...extraLabels])],
  };
}
