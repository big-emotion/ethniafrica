import { describe, expect, it } from "vitest";

import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute } from "@/lib/routing";
import { getSiteTree } from "@/lib/siteTree";

describe("getSiteTree — access-mode labels", () => {
  // @req REQ-110 @req REQ-114
  it("names access-mode destinations from the canonical map", () => {
    const tree = getSiteTree("fr");
    const links = tree.flatMap((section) => section.links);

    for (const [mode, page] of [
      ["explorer", "explorerHub"],
      ["comprendre", "comprendreHub"],
      ["jouer", "jouerHub"],
    ] as const) {
      expect(links).toContainEqual(
        expect.objectContaining({
          href: getLocalizedRoute("fr", page),
          label: ACCESS_MODE_LABELS[mode],
        })
      );
    }

    expect(tree.find((section) => section.id === "comprendre")?.title).toBe(
      ACCESS_MODE_LABELS.comprendre
    );
    expect(tree.find((section) => section.id === "jouer")?.title).toBe(
      ACCESS_MODE_LABELS.jouer
    );
  });
});
