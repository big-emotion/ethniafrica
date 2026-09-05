import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((destination: string) => {
    throw new Error(`NEXT_REDIRECT:${destination}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import Home from "@/app/page";
import { DEFAULT_LOCALE } from "@/lib/locale";

/**
 * The middleware answers `/` before this page ever renders, reading the
 * cookie the page cannot see. The page is the fallback for a render the
 * middleware did not front — a direct invocation, a matcher change — and so
 * it can only send the reader to the default.
 */
describe("root page", () => {
  // @req REQ-140
  it("falls back to the default locale when rendered without the middleware", () => {
    expect(() => Home()).toThrow(`NEXT_REDIRECT:/${DEFAULT_LOCALE}`);
    expect(redirect).toHaveBeenCalledWith(`/${DEFAULT_LOCALE}`);
  });
});
