import { describe, it, expect } from "vitest";
import { validatePage, validatePerPage } from "../validation";

describe("validatePerPage", () => {
  // @req REQ-110
  it("caps a page size above the documented maximum and reports the applied cap", () => {
    expect(validatePerPage("250")).toBe(100);
  });

  // @req REQ-110
  it("applies a requested page size within the documented maximum", () => {
    expect(validatePerPage("42")).toBe(42);
  });

  // @req REQ-110
  it("respects a custom maximum when provided", () => {
    expect(validatePerPage("250", 50)).toBe(50);
  });

  // @req REQ-110
  it("falls back to the default (20) for non-numeric input", () => {
    expect(validatePerPage("not-a-number")).toBe(20);
  });

  // @req REQ-110
  it("falls back to the default (20) for a value below 1", () => {
    expect(validatePerPage("0")).toBe(20);
    expect(validatePerPage("-5")).toBe(20);
  });

  // @req REQ-110
  it("falls back to the default (20) when omitted", () => {
    expect(validatePerPage(null)).toBe(20);
    expect(validatePerPage(undefined)).toBe(20);
  });
});

describe("validatePage", () => {
  // @req REQ-110
  it("parses a valid page number", () => {
    expect(validatePage("3")).toBe(3);
  });

  // @req REQ-110
  it("falls back to page 1 for invalid or missing input", () => {
    expect(validatePage(null)).toBe(1);
    expect(validatePage("0")).toBe(1);
    expect(validatePage("not-a-number")).toBe(1);
  });
});
