import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requestHeaders = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => requestHeaders.get(name) ?? null,
  })),
}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
// next/font/google needs a build-time loader; the face variables are not the
// subject here.
vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "fraunces" }),
  Nunito_Sans: () => ({ variable: "nunito" }),
  JetBrains_Mono: () => ({ variable: "mono" }),
}));
vi.mock("@/index.css", () => ({}));
vi.mock("@/app/providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/TypeformPreload", () => ({
  TypeformPreload: () => null,
}));
vi.mock("@/components/PlausibleScript", () => ({ default: () => null }));

import RootLayout from "@/app/layout";
import { LOCALE_HEADER } from "@/lib/locale";

const htmlElement = async () =>
  (await RootLayout({ children: null })) as ReactElement<{ lang: string }>;

/**
 * The root layout sits above the `[lang]` segment and cannot read its
 * params, so the document language comes from the header the middleware
 * resolved. Assistive technology reads `<html lang>` before anything else on
 * the page: an English page announced as French is read with the wrong
 * pronunciation rules from the first word.
 */
describe("root layout document language", () => {
  beforeEach(() => {
    requestHeaders.clear();
  });

  // @req REQ-140
  it("declares the locale the middleware resolved", async () => {
    requestHeaders.set(LOCALE_HEADER, "fr");
    expect((await htmlElement()).props.lang).toBe("fr");

    requestHeaders.set(LOCALE_HEADER, "en");
    expect((await htmlElement()).props.lang).toBe("en");
  });

  // @req REQ-140
  it("falls back to the default locale when no locale was resolved", async () => {
    expect((await htmlElement()).props.lang).toBe("en");
  });

  // The header is trusted only for the values the site publishes: anything
  // else is treated as unresolved rather than written into the document.
  // @req REQ-140
  it("ignores a header value that names no published locale", async () => {
    requestHeaders.set(LOCALE_HEADER, "es");
    expect((await htmlElement()).props.lang).toBe("en");
  });
});
