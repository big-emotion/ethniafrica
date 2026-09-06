import { describe, expect, it, vi } from "vitest";
vi.mock("@sentry/nextjs", () => ({
  withSentryConfig: (config: unknown) => config,
}));

describe("dossier deployment assets", () => {
  // @req REQ-114 @req REQ-140
  it("includes both source records and translation overlays in server traces", async () => {
    const { default: config } = await import("../../next.config");
    expect(config.outputFileTracingIncludes?.["/*/dossiers/*"]).toEqual(
      expect.arrayContaining([
        "./dataset/source/afrik/dossiers/*.json",
        "./dataset/translations/en/dossiers/*.json",
      ])
    );
  });
});
