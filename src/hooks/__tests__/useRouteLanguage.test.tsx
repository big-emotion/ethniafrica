import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navigation = await vi.hoisted(async () => {
  const { mockRouteLanguage } = await import("@/test/mockRouteLanguage");
  return mockRouteLanguage("fr");
});
vi.mock("next/navigation", () => navigation);

import { useRouteLanguage } from "@/hooks/use-language";
import { getDefaultLocale } from "@/lib/locale";

/**
 * The locale a client component formats in is the locale of the page it is
 * on, and nothing else: not a stored preference, not the browser's, not a
 * literal. A chip deep in a fiche cannot be handed the locale by every
 * caller, so it reads the route.
 */
describe("useRouteLanguage (REQ-140)", () => {
  // @req REQ-140
  it("answers the locale of the route the component is rendered on", () => {
    navigation.route.pathname = "/fr/atlas/peuples/PPL_YORUBA";
    expect(renderHook(() => useRouteLanguage()).result.current).toBe("fr");

    navigation.route.pathname = "/en/atlas/peoples/PPL_YORUBA";
    expect(renderHook(() => useRouteLanguage()).result.current).toBe("en");
  });

  // Outside the App Router — a story, a test that never mocked the route —
  // the real `usePathname` answers null. The configured default locale is the
  // honest answer there; while publication is closed, that remains French.
  // @req REQ-140
  it("falls back to the default locale when there is no route to read", () => {
    navigation.route.pathname = null;
    expect(renderHook(() => useRouteLanguage()).result.current).toBe(
      getDefaultLocale()
    );

    navigation.route.pathname = "/api/v2/peoples";
    expect(renderHook(() => useRouteLanguage()).result.current).toBe(
      getDefaultLocale()
    );
  });

  // @req REQ-140
  it("derives the mocked params from the mocked pathname", () => {
    navigation.route.pathname = "/en/sources";
    expect(navigation.useParams()).toEqual({ lang: "en" });
    navigation.route.pathname = null;
    expect(navigation.useParams()).toBeNull();
  });
});
