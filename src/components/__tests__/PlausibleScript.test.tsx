import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

type CrossOriginValue =
  React.ScriptHTMLAttributes<HTMLScriptElement>["crossOrigin"];

type ScriptMockProps = {
  src?: string;
  crossOrigin?: CrossOriginValue;
  strategy?: string;
  "data-domain"?: string;
  [key: string]: unknown;
};

// Mock next/script to render a regular <script> element so happy-dom can introspect it.
// `strategy` is destructured out to keep it off the DOM node; the rest spread is unused
// by design since we forward only the attrs we need.
vi.mock("next/script", () => ({
  default: ({
    src,
    crossOrigin,
    "data-domain": dataDomain,
    strategy: _strategy,
    ...rest
  }: ScriptMockProps) => (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script src={src} crossOrigin={crossOrigin} data-domain={dataDomain} />
  ),
}));

// Mutable consent flag read by the hook mock below.
// Must be module-level so it is available at vi.mock() hoisting time.
let analyticsConsented = false;

vi.mock("@/hooks/use-consent", () => ({
  useConsent: () => ({
    consentState: {
      hasConsented: analyticsConsented,
      preferences: {
        essential: true,
        analytics: analyticsConsented,
        functional: false,
      },
      consentDate: analyticsConsented ? new Date().toISOString() : null,
    },
    acceptAll: vi.fn(),
    rejectAll: vi.fn(),
    updatePreferences: vi.fn(),
    showBanner: false,
    setShowBanner: vi.fn(),
  }),
}));

describe("PlausibleScript", () => {
  const originalDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const originalCustomDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN;

  beforeEach(() => {
    analyticsConsented = false;
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN;
  });

  afterEach(() => {
    if (originalDomain !== undefined) {
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = originalDomain;
    } else {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    }
    if (originalCustomDomain !== undefined) {
      process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN = originalCustomDomain;
    } else {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN;
    }
  });

  describe("renders nothing (no script injected)", () => {
    it("when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is not set (analytics consented)", async () => {
      analyticsConsented = true;
      const { default: PlausibleScript } = await import("../PlausibleScript");
      const { container } = render(<PlausibleScript />);
      expect(container.firstChild).toBeNull();
    });

    it("when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is empty (analytics consented)", async () => {
      analyticsConsented = true;
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "";
      const { default: PlausibleScript } = await import("../PlausibleScript");
      const { container } = render(<PlausibleScript />);
      expect(container.firstChild).toBeNull();
    });

    it("when analytics consent has not been granted (domain is set)", async () => {
      analyticsConsented = false;
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "mysite.com";
      const { default: PlausibleScript } = await import("../PlausibleScript");
      const { container } = render(<PlausibleScript />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("with domain set and analytics consent granted", () => {
    beforeEach(() => {
      analyticsConsented = true;
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "mysite.com";
    });

    it("renders a script tag", async () => {
      const { default: PlausibleScript } = await import("../PlausibleScript");
      render(<PlausibleScript />);
      const script = document.querySelector("script");
      expect(script).not.toBeNull();
    });

    it("sets src to the default plausible.io script URL", async () => {
      const { default: PlausibleScript } = await import("../PlausibleScript");
      render(<PlausibleScript />);
      const script = document.querySelector("script");
      expect(script?.getAttribute("src")).toBe(
        "https://plausible.io/js/script.js"
      );
    });

    it("sets data-domain to NEXT_PUBLIC_PLAUSIBLE_DOMAIN", async () => {
      const { default: PlausibleScript } = await import("../PlausibleScript");
      render(<PlausibleScript />);
      const script = document.querySelector("script");
      expect(script?.getAttribute("data-domain")).toBe("mysite.com");
    });

    it("sets crossOrigin to anonymous", async () => {
      const { default: PlausibleScript } = await import("../PlausibleScript");
      render(<PlausibleScript />);
      const script = document.querySelector("script");
      expect(script?.getAttribute("crossorigin")).toBe("anonymous");
    });

    it("uses NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN as script base when set", async () => {
      process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN =
        "https://stats.mysite.com";
      const { default: PlausibleScript } = await import("../PlausibleScript");
      render(<PlausibleScript />);
      const script = document.querySelector("script");
      expect(script?.getAttribute("src")).toBe(
        "https://stats.mysite.com/js/script.js"
      );
    });
  });
});
