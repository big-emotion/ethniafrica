import { vi } from "vitest";

import { getDefaultLocale, isLocale } from "@/lib/locale";
import type { Language } from "@/types/shared";

/**
 * A `next/navigation` stand-in that puts a component on a route of one
 * locale, for the suites that assert French — or English — copy.
 *
 * Outside the App Router, the real `usePathname()` and `useParams()` answer
 * `null`, and the route-reading hooks then fall back to the default locale,
 * which follows the publication configuration (REQ-140). A test should still
 * state which locale it stands on so it remains valid when the gate changes.
 *
 * ```ts
 * const navigation = await vi.hoisted(async () => {
 *   const { mockRouteLanguage } = await import("@/test/mockRouteLanguage");
 *   return mockRouteLanguage("fr");
 * });
 * vi.mock("next/navigation", () => navigation);
 * ```
 *
 * `vi.hoisted` because `vi.mock` is hoisted above every import and its
 * factory may not close over one; the dynamic import inside is the one
 * form vitest guarantees. Move the route between tests by assigning
 * `navigation.route.pathname`; assert navigation through `navigation.push`
 * and `navigation.replace`. A suite that needs more of the module spreads
 * this object: `vi.mock("next/navigation", () => ({ ...navigation, notFound }))`.
 *
 * `useParams` is derived from the pathname rather than set separately, so a
 * test cannot stand on `/fr/...` while its params say `en`.
 */
export interface RouteLanguageMock {
  route: { pathname: string | null };
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  usePathname: () => string | null;
  useParams: () => { lang: Language } | null;
  useSearchParams: () => URLSearchParams;
  useRouter: () => {
    push: ReturnType<typeof vi.fn>;
    replace: ReturnType<typeof vi.fn>;
    prefetch: ReturnType<typeof vi.fn>;
    back: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  };
}

// @req REQ-140
export function mockRouteLanguage(
  locale: Language,
  pathname: string = `/${locale}`
): RouteLanguageMock {
  const route = { pathname };
  const push = vi.fn();
  const replace = vi.fn();
  const router = {
    push,
    replace,
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  };

  return {
    route,
    push,
    replace,
    usePathname: () => route.pathname,
    useParams: () => {
      if (route.pathname === null) return null;
      const [head] = route.pathname.split("/").filter(Boolean);
      return { lang: isLocale(head) ? head : getDefaultLocale() };
    },
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => router,
  };
}
