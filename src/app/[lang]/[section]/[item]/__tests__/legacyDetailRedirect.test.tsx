import { describe, it, expect, vi } from "vitest";

import LegacyDetailRedirect from "../page";

/**
 * Legacy slug URLs are the last inbound links still aimed at the retired
 * query-parameter detail view. A family one must land on the charter fiche,
 * not on the directory carrying `?family=`.
 */

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

async function redirectTargetOf(section: string, item: string) {
  try {
    await LegacyDetailRedirect({
      params: Promise.resolve({ lang: "fr", section, item }),
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message.startsWith("NEXT_REDIRECT:")) {
      return message.slice("NEXT_REDIRECT:".length);
    }
    throw error;
  }
  throw new Error(`${section}/${item} did not redirect`);
}

describe("LegacyDetailRedirect", () => {
  // @req REQ-019
  it("sends a legacy family slug to the family fiche", async () => {
    expect(await redirectTargetOf("familles", "FLG_BANTU")).toBe(
      "/fr/familles/FLG_BANTU"
    );
  });

  // @req REQ-019
  it("sends a retired region slug to the family fiche that replaced it", async () => {
    expect(await redirectTargetOf("regions", "FLG_BANTU")).toBe(
      "/fr/familles/FLG_BANTU"
    );
  });

  // @req REQ-019
  it("percent-encodes a slug carrying a reserved character", async () => {
    expect(await redirectTargetOf("regions", "FLG BANTU/1")).toBe(
      "/fr/familles/FLG%20BANTU%2F1"
    );
  });
});
