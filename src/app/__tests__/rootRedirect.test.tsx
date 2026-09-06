import { afterEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import Home from "@/app/page";

/**
 * The middleware answers `/` before this page ever renders, reading the
 * cookie the page cannot see. The page is the fallback for a render the
 * middleware did not front — a direct invocation, a matcher change — and so
 * it can only send the reader to the default.
 */
describe("root page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    redirect.mockClear();
  });

  // @req REQ-140
  it.each([
    [undefined, "/fr"],
    ["fr-only", "/fr"],
    ["bilingual-fr-default", "/fr"],
    ["bilingual-en-default", "/en"],
  ])("uses %s mode to redirect to %s", (mode, destination) => {
    vi.stubEnv("SITE_LOCALE_MODE", mode);

    expect(() => Home()).toThrow(`NEXT_REDIRECT:${destination}`);
    expect(redirect).toHaveBeenCalledWith(destination);
  });
});
