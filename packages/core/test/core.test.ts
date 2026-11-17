import { describe, expect, it } from "vitest";
import { assertForms, buildIssue, DEFAULT_FORMS, neutralize, parseReportRequest, reportUrls, type FormTemplate } from "../src";

const base = {
  projectKey: "pk_" + "a".repeat(24), turnstileToken: "t", elapsedMs: 5000,
  kind: "bug", title: " Save fails ", fields: { steps: "1. click", actual: "nothing" },
};

describe("parseReportRequest", () => {
  it("accepts a valid bug report and fills missing optional fields", () => {
    const r = parseReportRequest(base)!;
    expect(r.title).toBe("Save fails");
    expect(r.fields).toEqual({ steps: "1. click", expected: "", actual: "nothing" });
  });
  it("rejects missing required field, unknown field, unknown kind, bad key", () => {
    expect(parseReportRequest({ ...base, fields: { steps: "x" } })).toBeNull();
    expect(parseReportRequest({ ...base, fields: { ...base.fields, evil: "x" } })).toBeNull();
    expect(parseReportRequest({ ...base, kind: "spam" })).toBeNull();
    expect(parseReportRequest({ ...base, projectKey: "pk_short" })).toBeNull();
    expect(parseReportRequest({ ...base, title: "x".repeat(101) })).toBeNull();
    expect(parseReportRequest({ ...base, meta: { "[x](https://e)": "v" } })).toBeNull();
  });
  it("validates select and checkbox against the form type", () => {
    const forms: FormTemplate[] = [{ kind: "other", label: "O", fields: [
      { id: "sev", type: "select", label: "S", options: [{ value: "high", label: "High" }] },
      { id: "ok", type: "checkbox", label: "OK" },
    ] }];
    const req = { ...base, kind: "other", fields: { sev: "high", ok: "true" } };
    expect(parseReportRequest(req, forms)).not.toBeNull();
    expect(parseReportRequest({ ...req, fields: { sev: "low" } }, forms)).toBeNull();
    expect(parseReportRequest({ ...req, fields: { ok: "yes" } }, forms)).toBeNull();
  });
});

describe("assertForms", () => {
  it("accepts defaults and rejects broken types", () => {
    expect(() => assertForms(DEFAULT_FORMS)).not.toThrow();
    expect(() => assertForms([...DEFAULT_FORMS, DEFAULT_FORMS[0]])).toThrow(/duplicate kind/);
    expect(() => assertForms([{ kind: "bug", label: "B", fields: [{ id: "a b", type: "text", label: "x" }] }])).toThrow(/field id/);
    expect(() => assertForms([{ kind: "bug", label: "B", fields: [{ id: "s", type: "select", label: "x" }] }])).toThrow(/options/);
  });
});

describe("buildIssue", () => {
  it("builds sections from the form type, neutralizes mentions, escapes meta", () => {
    const r = parseReportRequest({ ...base, fields: { steps: "ping @octocat #12", actual: "boom" }, meta: { page: "a|b`c", x: "<a href=https://spam>", y: "[x](https://e)", w: "www.spam.com" } })!;
    const i = buildIssue(r, DEFAULT_FORMS, ["extra"]);
    expect(i.title).toBe("[Bug] Save fails");
    expect(i.labels).toEqual(["via-widget", "bug", "extra"]);
    expect(i.body).toContain("### Steps to reproduce\n\nping @​octocat #​12");
    expect(i.body).not.toContain("### Expected behavior");
    expect(i.body).toContain("| x | <code>&#60;a href=https&#58;//spam&#62;</code> |");
    expect(i.body).toContain("| y | <code>&#91;x&#93;&#40;https&#58;//e&#41;</code> |");
    expect(i.body).toContain("| w | <code>www&#46;spam&#46;com</code> |");
    expect(i.body).toContain("| page | <code>a&#124;b&#96;c</code> |");
  });
  it("counts urls across all fields", () => {
    expect(reportUrls({ kind: "bug", title: "http://a", fields: { x: "www.b https://c" } })).toBe(3);
    // Markdown のリンク・画像、プロトコル相対 URL も数える
    expect(reportUrls({ kind: "bug", title: "t", fields: { x: "[a](//e.com) ![b](/img) <img src=//t.co/x> see //evil.com" } })).toBe(4);
    expect(reportUrls({ kind: "bug", title: "t", fields: { x: "a // comment and path/to//file" } })).toBe(0);
    expect(neutralize("mail a@b")).toBe("mail a@​b");
  });
});

import { parseFormsInput } from "../src";
describe("parseFormsInput", () => {
  it("accepts a valid template and drops unknown properties", () => {
    const r = parseFormsInput([{ kind: "bug", label: { en: "Bug", ja: "バグ" }, evil: "<x>", fields: [
      { id: "steps", type: "textarea", required: true, label: "Steps", onclick: "x" },
      { id: "sev", type: "select", label: "Severity", options: [{ value: "low", label: "Low" }] },
    ] }]);
    expect(r).toEqual([{ kind: "bug", label: { en: "Bug", ja: "バグ" }, fields: [
      { id: "steps", type: "textarea", label: "Steps", required: true },
      { id: "sev", type: "select", label: "Severity", options: [{ value: "low", label: "Low" }] },
    ] }]);
  });
  it("rejects broken or oversized input with a message", () => {
    for (const bad of [null, [], [{ kind: "spam", label: "x", fields: [] }], [{ kind: "bug", label: "", fields: [] }],
      [{ kind: "bug", label: "B", fields: [{ id: "a b", type: "text", label: "x" }] }],
      [{ kind: "bug", label: "B", fields: [{ id: "s", type: "select", label: "x" }] }],
      [{ kind: "bug", label: "B", fields: Array(16).fill({ id: "a", type: "text", label: "x" }) }],
      [{ kind: "bug", label: "B", fields: [] }, { kind: "bug", label: "B", fields: [] }]]) {
      expect(typeof parseFormsInput(bad)).toBe("string");
    }
  });
});
