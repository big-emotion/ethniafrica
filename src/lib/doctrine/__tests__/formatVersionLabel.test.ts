import { describe, it, expect } from "vitest";
import { formatVersionLabel } from "../formatVersionLabel";

describe("formatVersionLabel", () => {
  it("formats version label with long French date", () => {
    const label = formatVersionLabel(1, "2026-05-14T00:00:00Z");
    expect(label).toMatch(/^v1 · publiée le \d{1,2} \S+ 2026$/);
  });

  it("renders 'mai' for May", () => {
    const label = formatVersionLabel(2, "2026-05-14T12:00:00Z");
    expect(label).toContain("mai");
    expect(label).toContain("v2");
  });

  it("renders 'décembre' for December", () => {
    const label = formatVersionLabel(3, "2026-12-01T12:00:00Z");
    expect(label).toContain("décembre");
  });

  // The date is a UTC instant, so it must render as the same calendar day
  // everywhere. Read in the runner's local zone, a midnight-UTC timestamp
  // slips to the previous day for every reader west of Greenwich.
  // @req REQ-025
  it("renders a midnight-UTC instant as the same calendar day in any zone", () => {
    expect(formatVersionLabel(1, "2026-05-14T00:00:00Z")).toBe(
      "v1 · publiée le 14 mai 2026"
    );
  });

  // The date is a UTC instant, so it must render as the same calendar day
  // everywhere. Read in the runner's local zone, a midnight-UTC timestamp
  // slips to the previous day for every reader west of Greenwich.
  // @req REQ-025
  it("renders a midnight-UTC instant as the same calendar day in any zone", () => {
    expect(formatVersionLabel(1, "2026-05-14T00:00:00Z")).toBe(
      "v1 · publiée le 14 mai 2026"
    );
  });

  it("handles double-digit versions", () => {
    const label = formatVersionLabel(42, "2026-05-14T00:00:00Z");
    expect(label.startsWith("v42 · publiée le ")).toBe(true);
  });
});
