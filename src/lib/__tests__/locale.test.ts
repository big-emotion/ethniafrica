import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FALLBACK_LOCALE,
  LOCALES,
  LOCALE_MODES,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  getDefaultLocale,
  getLocalePublicationMode,
  getPublishedLocales,
  isLocale,
  isPublishedLocale,
  localeCookieAttributes,
  resolveLocale,
} from "@/lib/locale";

describe("the published locales (REQ-140)", () => {
  // @req REQ-140
  it("supports exactly English and French in the bilingual codebase", () => {
    expect(LOCALES).toEqual(["en", "fr"]);
  });

  // @req REQ-140
  it("keeps French as the fail-closed fallback", () => {
    expect(FALLBACK_LOCALE).toBe("fr");
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

describe("locale publication modes (REQ-140)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // @req REQ-140
  it("accepts the three deliberate publication states", () => {
    expect(LOCALE_MODES).toEqual([
      "fr-only",
      "bilingual-fr-default",
      "bilingual-en-default",
    ]);
  });

  // Missing or misspelled configuration must not publish unfinished English.
  // @req REQ-140
  it.each([undefined, "", "true", "bilingual", "EN"])(
    "fails closed to French-only for %s",
    (value) => {
      if (value === undefined) vi.stubEnv("SITE_LOCALE_MODE", undefined);
      else vi.stubEnv("SITE_LOCALE_MODE", value);

      expect(getLocalePublicationMode()).toBe("fr-only");
      expect(getPublishedLocales()).toEqual(["fr"]);
      expect(getDefaultLocale()).toBe("fr");
      expect(isPublishedLocale("fr")).toBe(true);
      expect(isPublishedLocale("en")).toBe(false);
    }
  );

  // @req REQ-140
  it.each([
    ["fr-only", ["fr"], "fr"],
    ["bilingual-fr-default", ["en", "fr"], "fr"],
    ["bilingual-en-default", ["en", "fr"], "en"],
  ] as const)(
    "resolves %s to its published locales and default",
    (mode, locales, defaultLocale) => {
      vi.stubEnv("SITE_LOCALE_MODE", mode);

      expect(getLocalePublicationMode()).toBe(mode);
      expect(getPublishedLocales()).toEqual(locales);
      expect(getDefaultLocale()).toBe(defaultLocale);
    }
  );
});

describe("resolving the reader's choice from the cookie (REQ-140)", () => {
  // @req REQ-140
  it("ignores an English cookie while English is unpublished", () => {
    expect(resolveLocale("fr", "fr-only")).toBe("fr");
    expect(resolveLocale("en", "fr-only")).toBe("fr");
  });

  // @req REQ-140
  it("honours either explicit choice in a bilingual mode", () => {
    expect(resolveLocale("fr", "bilingual-en-default")).toBe("fr");
    expect(resolveLocale("en", "bilingual-fr-default")).toBe("en");
  });

  // A tampered or stale cookie is not a choice: it falls back to the default
  // rather than to a locale the site does not publish.
  // @req REQ-140
  it("falls back to the default for an absent or unknown value", () => {
    expect(resolveLocale(undefined, "bilingual-en-default")).toBe("en");
    expect(resolveLocale("", "bilingual-fr-default")).toBe("fr");
    expect(resolveLocale("xx", "fr-only")).toBe("fr");
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
