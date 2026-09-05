import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  pathname: "/",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

import { useLanguage } from "../use-language";
import { LOCALE_COOKIE } from "@/lib/locale";
import {
  getLocalizedRoute,
  getPeopleLinksRoute,
  getStaticPageRoute,
} from "@/lib/routing";

// A past `expires` rather than `max-age=0`: happy-dom turns max-age into
// `expires = now` and only drops a cookie once `expires < now`, so a read in
// the same millisecond as the clearing write still sees `ethni-locale=`.
const clearLocaleCookie = () => {
  document.cookie = `${LOCALE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

// `document.cookie` only ever reads back name=value pairs, so the attributes
// a write carries are visible nowhere but on the setter. The setter lives on
// the prototype that owns the accessor — which under vitest is not the
// `Document` global, a different class from the instance's own chain.
const cookieSetterOwner = () => {
  let prototype = Object.getPrototypeOf(document);
  while (!Object.getOwnPropertyDescriptor(prototype, "cookie")) {
    prototype = Object.getPrototypeOf(prototype);
  }
  return prototype;
};

/**
 * The hook answers one question — which locale is this page in — and does
 * one thing on a switch: remember the choice where the middleware can read
 * it, then move to the same page in the other locale (REQ-140).
 */
describe("useLanguage", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    navigation.push.mockReset();
    clearLocaleCookie();
    window.history.replaceState({}, "", "/");
    localStorage.clear();
  });

  // @req REQ-140
  it("reads the locale off the route before anything else", () => {
    navigation.pathname = getLocalizedRoute("fr", "peoples");
    document.cookie = `${LOCALE_COOKIE}=en; path=/`;

    const { result } = renderHook(() => useLanguage());

    expect(result.current.language).toBe("fr");
  });

  // @req REQ-140
  it("falls back to the remembered cookie off the locale tree", () => {
    document.cookie = `${LOCALE_COOKIE}=fr; path=/`;

    const { result } = renderHook(() => useLanguage());

    expect(result.current.language).toBe("fr");
  });

  // @req REQ-140
  it("defaults to English with neither route nor cookie", () => {
    const { result } = renderHook(() => useLanguage());

    expect(result.current.language).toBe("en");
  });

  // The middleware resolves the root before any client code runs, and
  // localStorage never travels with a request: a choice kept only there is a
  // choice the server cannot honour, which is why it is no longer read.
  // @req REQ-140
  it("never reads a choice from localStorage", () => {
    localStorage.setItem("ethniafrique-language", "fr");

    const { result } = renderHook(() => useLanguage());

    expect(result.current.language).toBe("en");
  });

  // @req REQ-140
  it("remembers a switch in the cookie with the shared attributes", () => {
    navigation.pathname = getLocalizedRoute("en", "peoples");
    const written: string[] = [];
    const cookieSetter = vi
      .spyOn(cookieSetterOwner(), "cookie", "set")
      .mockImplementation((value: string) => {
        written.push(value);
      });

    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLanguage("fr"));

    cookieSetter.mockRestore();
    expect(written).toEqual([
      `${LOCALE_COOKIE}=fr; path=/; SameSite=Lax; max-age=31536000`,
    ]);
  });

  // @req REQ-141
  it("moves to the same page in the other locale, query string kept", () => {
    navigation.pathname = getPeopleLinksRoute("fr", "PPL_YORUBA");
    window.history.replaceState({}, "", `${navigation.pathname}?tri=nom`);

    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLanguage("en"));

    // The route is what the hook answers from, so the switch shows once the
    // navigation lands — a pathname held still here reports the old locale.
    expect(navigation.push).toHaveBeenCalledWith(
      `${getPeopleLinksRoute("en", "PPL_YORUBA")}?tri=nom`
    );
  });

  // @req REQ-141
  it("translates a static page and the home as well", () => {
    navigation.pathname = getStaticPageRoute("fr", "legalNotice");
    const { result: legal } = renderHook(() => useLanguage());
    act(() => legal.current.setLanguage("en"));
    expect(navigation.push).toHaveBeenCalledWith(
      getStaticPageRoute("en", "legalNotice")
    );

    navigation.pathname = "/en";
    const { result: home } = renderHook(() => useLanguage());
    act(() => home.current.setLanguage("fr"));
    expect(navigation.push).toHaveBeenCalledWith("/fr");
  });

  // @req REQ-140
  it("lands on the locale home when the page is outside the locale tree", () => {
    navigation.pathname = "/docs/api";

    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLanguage("fr"));

    expect(navigation.push).toHaveBeenCalledWith("/fr");
  });

  // @req REQ-140
  it("refuses a value that is not a published locale", () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLanguage("es" as never));

    expect(navigation.push).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain(`${LOCALE_COOKIE}=`);
    expect(result.current.language).toBe("en");
  });
});
