import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { LOCALE_COOKIE } from "@/lib/locale";
import {
  getLocalizedRoute,
  getPeopleLinksRoute,
  getStaticPageRoute,
} from "@/lib/routing";

// `document.cookie` reads back name=value pairs only; the attributes a write
// carries are visible nowhere but on the setter, which under vitest lives on
// a prototype above the instance's own chain.
const cookieSetterOwner = () => {
  let prototype = Object.getPrototypeOf(document);
  while (!Object.getOwnPropertyDescriptor(prototype, "cookie")) {
    prototype = Object.getPrototypeOf(prototype);
  }
  return prototype;
};

const otherLocaleLink = (name: string) => screen.getByRole("link", { name });

beforeEach(() => {
  navigation.pathname = "/";
  window.history.replaceState({}, "", "/");
  // A past `expires` rather than `max-age=0`: happy-dom turns max-age into
  // `expires = now` and only drops a cookie once `expires < now`, so a read
  // in the same millisecond as this write would still see `ethni-locale=`.
  document.cookie = `${LOCALE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
});

afterEach(cleanup);

describe("LanguageSwitcher — the other locale, named in itself", () => {
  // @req REQ-140
  it("offers the other locale and only the other locale", () => {
    navigation.pathname = getLocalizedRoute("en", "peoples");
    render(<LanguageSwitcher language="en" />);

    expect(otherLocaleLink("Français")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "English" })).toBeNull();
  });

  // The label is read by the reader who wants that locale, so it is spoken
  // in it: a screen reader announcing « Français » with French phonetics is
  // the whole point of the `lang` attribute.
  // @req REQ-140
  it("declares the label's language and the destination's", () => {
    navigation.pathname = getLocalizedRoute("fr", "peoples");
    render(<LanguageSwitcher language="fr" />);

    const link = otherLocaleLink("English");
    expect(link).toHaveAttribute("lang", "en");
    expect(link).toHaveAttribute("hreflang", "en");
  });

  // @req REQ-140
  it("gives the control a 44px hit area in both dresses", () => {
    navigation.pathname = getLocalizedRoute("en", "peoples");
    render(<LanguageSwitcher language="en" />);
    expect(otherLocaleLink("Français")).toHaveClass("min-h-11");
    cleanup();

    render(<LanguageSwitcher language="en" appearance="row" />);
    expect(otherLocaleLink("Français")).toHaveClass("min-h-11");
    expect(otherLocaleLink("Français")).toHaveTextContent("Français");
  });
});

describe("LanguageSwitcher — the same page in the other locale (REQ-141)", () => {
  // @req REQ-141
  it("targets the translated path, tail words included", () => {
    navigation.pathname = getPeopleLinksRoute("fr", "PPL_YORUBA");
    render(<LanguageSwitcher language="fr" />);

    expect(otherLocaleLink("English")).toHaveAttribute(
      "href",
      getPeopleLinksRoute("en", "PPL_YORUBA")
    );
  });

  // @req REQ-141
  it("keeps the query string the reader is holding", () => {
    navigation.pathname = getStaticPageRoute("en", "reports");
    window.history.replaceState({}, "", `${navigation.pathname}?status=open`);
    render(<LanguageSwitcher language="en" />);

    expect(otherLocaleLink("Français")).toHaveAttribute(
      "href",
      `${getStaticPageRoute("fr", "reports")}?status=open`
    );
  });

  // @req REQ-140
  it("lands on the locale home from a page outside the locale tree", () => {
    navigation.pathname = "/docs/api";
    render(<LanguageSwitcher language="en" />);

    expect(otherLocaleLink("Français")).toHaveAttribute("href", "/fr");
  });
});

describe("LanguageSwitcher — the choice is remembered (REQ-140)", () => {
  // @req REQ-140
  it("writes the locale cookie with the shared attributes on click", () => {
    navigation.pathname = getLocalizedRoute("en", "countries");
    const written: string[] = [];
    const cookieSetter = vi
      .spyOn(cookieSetterOwner(), "cookie", "set")
      .mockImplementation((value: string) => {
        written.push(value);
      });

    render(<LanguageSwitcher language="en" />);
    fireEvent.click(otherLocaleLink("Français"));

    cookieSetter.mockRestore();
    expect(written).toEqual([
      `${LOCALE_COOKIE}=fr; path=/; SameSite=Lax; max-age=31536000`,
    ]);
  });

  // Landing on a locale is not a choice; only the click is. Rendering the
  // control must therefore leave the cookie alone.
  // @req REQ-140
  it("writes nothing until the reader clicks", () => {
    navigation.pathname = getLocalizedRoute("en", "countries");
    render(<LanguageSwitcher language="en" />);

    expect(document.cookie).not.toContain(`${LOCALE_COOKIE}=`);
  });
});
