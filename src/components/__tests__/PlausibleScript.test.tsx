import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

type CrossOriginValue =
  React.ScriptHTMLAttributes<HTMLScriptElement>["crossOrigin"];

type ScriptMockProps = {
  src?: string;
  defer?: boolean;
  crossOrigin?: CrossOriginValue;
  strategy?: string;
  "data-domain"?: string;
  "data-api"?: string;
  [key: string]: unknown;
};

// Mock next/script to render a regular <script> element so happy-dom can introspect it
vi.mock("next/script", () => ({
  default: ({
    src,
    defer,
    crossOrigin,
    "data-domain": dataDomain,
    "data-api": dataApi,
    strategy: _strategy,
  }: ScriptMockProps) => (
    <script
      src={src}
      defer={defer}
      crossOrigin={crossOrigin}
      data-domain={dataDomain}
      data-api={dataApi}
    />
  ),
}));

describe("PlausibleScript", () => {
  const originalDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const originalCustomDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN;

  beforeEach(() => {
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
    vi.resetModules();
  });

  it("renders nothing when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is not set", async () => {
    const { default: PlausibleScript } = await import(
      "@/components/PlausibleScript"
    );
    const { container } = render(<PlausibleScript />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is empty", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "";
    const { default: PlausibleScript } = await import(
      "@/components/PlausibleScript"
    );
    const { container } = render(<PlausibleScript />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a script tag when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "mysite.com";
    const { default: PlausibleScript } = await import(
      "@/components/PlausibleScript"
    );
    render(<PlausibleScript />);
    const script = document.querySelector("script");
    expect(script).not.toBeNull();
  });

  it("sets src to the default plausible.io script URL", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "mysite.com";
    const { default: PlausibleScript } = await import(
      "@/components/PlausibleScript"
    );
    render(<PlausibleScript />);
    const script = document.querySelector("script");
    expect(script?.getAttribute("src")).toBe(
      "https://plausible.io/js/script.js"
    );
  });

  it("sets data-domain to NEXT_PUBLIC_PLAUSIBLE_DOMAIN", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "mysite.com";
    const { default: PlausibleScript } = await import(
      "@/components/PlausibleScript"
    );
    render(<PlausibleScript />);
    const script = document.querySelector("script");
    expect(script?.getAttribute("data-domain")).toBe("mysite.com");
  });

  it("sets defer attribute on the script", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "mysite.com";
    const { default: PlausibleScript } = await import(
      "@/components/PlausibleScript"
    );
    render(<PlausibleScript />);
    const script = document.querySelector("script");
    expect(script).toHaveAttribute("defer");
  });

  it("sets crossOrigin to anonymous", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "mysite.com";
    const { default: PlausibleScript } = await import(
      "@/components/PlausibleScript"
    );
    render(<PlausibleScript />);
    const script = document.querySelector("script");
    expect(script?.getAttribute("crossorigin")).toBe("anonymous");
  });

  it("sets data-api attribute for proxying", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "mysite.com";
    const { default: PlausibleScript } = await import(
      "@/components/PlausibleScript"
    );
    render(<PlausibleScript />);
    const script = document.querySelector("script");
    expect(script).toHaveAttribute("data-api");
  });

  it("uses NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN as script base when set", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "mysite.com";
    process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN =
      "https://stats.mysite.com";
    const { default: PlausibleScript } = await import(
      "@/components/PlausibleScript"
    );
    render(<PlausibleScript />);
    const script = document.querySelector("script");
    expect(script?.getAttribute("src")).toBe(
      "https://stats.mysite.com/js/script.js"
    );
  });
});
