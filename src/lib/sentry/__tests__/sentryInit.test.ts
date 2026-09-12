import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({ init: vi.fn() }));

import * as Sentry from "@sentry/nextjs";

describe("Sentry runtime configurations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(Sentry.init).mockClear();
  });

  // The SDK's default has flipped between majors. Stated explicitly so an
  // upgrade cannot start attaching IPs, cookies and request bodies to every
  // event behind the scrubber's back.
  // @req REQ-057
  it.each([
    ["client", () => import("../../../../sentry.client.config")],
    ["server", () => import("../../../../sentry.server.config")],
    ["edge", () => import("../../../../sentry.edge.config")],
  ])(
    "the %s runtime never sends default PII and always scrubs",
    async (_runtime, load) => {
      await load();

      expect(Sentry.init).toHaveBeenCalledTimes(1);
      const options = vi.mocked(Sentry.init).mock.calls[0][0];
      expect(options?.sendDefaultPii).toBe(false);
      expect(options?.beforeSend).toBeTypeOf("function");
    }
  );
});
