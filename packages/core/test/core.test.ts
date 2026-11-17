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
    const r = parseReportRequest({ ...base, fields: { steps: "ping @octocat #12", actual: "boom" }, meta: { page: "a|b`c", x: "<a href=https://spam>", y: "[x](https://e)" } })!;
    const i = buildIssue(r, DEFAULT_FORMS, ["extra"]);
    expect(i.title).toBe("[Bug] Save fails");
    expect(i.labels).toEqual(["via-widget", "bug", "extra"]);
    expect(i.body).toContain("### Steps to reproduce\n\nping @​octocat #​12");
    expect(i.body).not.toContain("### Expected behavior");
    expect(i.body).toContain("| x | <code>&#60;a href=https&#58;//spam&#62;</code> |");
    expect(i.body).toContain("| y | <code>&#91;x&#93;&#40;https&#58;//e&#41;</code> |");
    expect(i.body).toContain("| page | <code>a&#124;b&#96;c</code> |");
  });
  it("counts urls across all fields", () => {
    expect(reportUrls({ kind: "bug", title: "http://a", fields: { x: "www.b https://c" } })).toBe(3);
    expect(neutralize("mail a@b")).toBe("mail a@​b");
  });
});
