import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  localeCookieAttributes,
  resolveLocale,
} from "@/lib/locale";

describe("the published locales (REQ-140)", () => {
  // @req REQ-140
  it("publishes exactly English and French, English first", () => {
    expect(LOCALES).toEqual(["en", "fr"]);
  });

  // @req REQ-140
  it("answers English when nothing says otherwise", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  // @req REQ-140
  it("recognises a published locale and nothing else", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("es")).toBe(false);
    expect(isLocale("quiz")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("resolving the reader's choice from the cookie (REQ-140)", () => {
  // @req REQ-140
  it("honours an explicit choice", () => {
    expect(resolveLocale("fr")).toBe("fr");
    expect(resolveLocale("en")).toBe("en");
  });

  // A tampered or stale cookie is not a choice: it falls back to the default
  // rather than to a locale the site does not publish.
  // @req REQ-140
  it("falls back to the default for an absent or unknown value", () => {
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("xx")).toBe(DEFAULT_LOCALE);
  });
});

describe("the locale cookie contract (REQ-140)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // @req REQ-140
  it("names the cookie and the request header the middleware sets", () => {
    expect(LOCALE_COOKIE).toBe("ethni-locale");
    expect(LOCALE_HEADER).toBe("x-locale");
  });

  // The switcher writes this cookie from the browser, so it cannot be
  // HttpOnly; the middleware reads it on every request, so it is site-wide
  // and lives a year.
  // @req REQ-140
  it("is site-wide, lax, one year long and readable by the switcher", () => {
    const attributes = localeCookieAttributes();
    expect(attributes.path).toBe("/");
    expect(attributes.sameSite).toBe("lax");
    expect(attributes.maxAge).toBe(60 * 60 * 24 * 365);
    expect(attributes).not.toHaveProperty("httpOnly");
  });

  // @req REQ-140
  it("is secure in production only, so localhost can still set it", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(localeCookieAttributes().secure).toBe(true);

    vi.stubEnv("NODE_ENV", "development");
    expect(localeCookieAttributes().secure).toBe(false);
  });
});
