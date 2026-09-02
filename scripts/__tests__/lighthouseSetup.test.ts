import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const prepareLighthouseSession = require("../lighthouse-setup.cjs");

describe("Lighthouse browser setup", () => {
  // @req REQ-046
  it("persists an essential-only consent choice before the audit", async () => {
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const browser = { newPage: vi.fn().mockResolvedValue(page) };

    await prepareLighthouseSession(browser, {
      url: "http://localhost:3000/fr/pays/SEN",
    });

    expect(page.goto).toHaveBeenCalledWith(
      "http://localhost:3000/fr/pays/SEN",
      { waitUntil: "domcontentloaded", timeout: 30_000 }
    );
    const [storageCallback, consentState] = page.evaluate.mock.calls[0];
    expect(storageCallback.toString()).toContain(
      'localStorage.setItem("ethni-consent"'
    );
    expect(consentState).toMatchObject({
      hasConsented: true,
      preferences: {
        essential: true,
        analytics: false,
        functional: false,
      },
    });
    expect(page.close).toHaveBeenCalledOnce();
  });

  // @req REQ-046
  it("audits the route anyway when the consent seed cannot be planted", async () => {
    const page = {
      goto: vi.fn().mockRejectedValue(new Error("Navigation timeout exceeded")),
      evaluate: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const browser = { newPage: vi.fn().mockResolvedValue(page) };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // lhci aborts collection on the first URL whose setup throws, which left
    // every route after it unmeasured — the budgets were not failing, they
    // were never evaluated.
    await expect(
      prepareLighthouseSession(browser, { url: "http://localhost:3000/fr" })
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalled();
    expect(page.close).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
