import { describe, expect, it } from "vitest";

import {
  AXIS_HUB_PAGE,
  getAxisForPage,
  getAxisHubRoute,
} from "@/lib/hubs/axisRoutes";
import {
  ACCESS_MODES,
  MODULE_DEFINITIONS,
  type AccessMode,
} from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute } from "@/lib/routing";

describe("axis hub routes", () => {
  // @req REQ-114
  it("addresses every access mode by a hub page", () => {
    for (const mode of ACCESS_MODES) {
      expect(AXIS_HUB_PAGE[mode]).toBeTruthy();
    }
  });

  // @req REQ-114
  it("builds each axis hub route from the routing table", () => {
    expect(getAxisHubRoute("fr", "explorer")).toBe("/fr/explorer");
    expect(getAxisHubRoute("fr", "comprendre")).toBe("/fr/comprendre");
    expect(getAxisHubRoute("fr", "jouer")).toBe("/fr/jouer");
  });

  // The point of the helper: a caller composing a route below an axis — a
  // game under Jouer, a facet under Explorer — must not spell the segment
  // out, or the axis moves and the caller stays behind.
  // @req REQ-114
  it("agrees with the routing table it delegates to", () => {
    for (const mode of ACCESS_MODES) {
      expect(getAxisHubRoute("fr", mode)).toBe(
        getLocalizedRoute("fr", AXIS_HUB_PAGE[mode])
      );
    }
  });
});

describe("which axis owns a page", () => {
  // @req REQ-114
  it("files a hub page under its own axis", () => {
    for (const mode of ACCESS_MODES) {
      expect(getAxisForPage(AXIS_HUB_PAGE[mode])).toBe(mode);
    }
  });

  // @req REQ-114
  it("files a module's page under the axis that lists the module", () => {
    for (const definition of MODULE_DEFINITIONS) {
      if (!definition.page) continue;
      expect(getAxisForPage(definition.page)).toBe(definition.accessMode);
    }
  });

  // A page claimed by two axes would nest under two URLs, and only one of
  // them could be the canonical. The registry is where that would happen,
  // so the assertion belongs on the registry rather than on the derived map.
  // @req REQ-114
  it("lets no page belong to two axes at once", () => {
    const axisByPage = new Map<string, AccessMode>();
    for (const definition of MODULE_DEFINITIONS) {
      if (!definition.page) continue;
      const claimed = axisByPage.get(definition.page);
      expect(claimed ?? definition.accessMode).toBe(definition.accessMode);
      axisByPage.set(definition.page, definition.accessMode);
    }
  });

  // About and Doctrine describe the project rather than the corpus, so no
  // axis leads to them and the map has nothing to answer. That is what lets
  // both keep a top-level canonical route without contradicting the nesting
  // rule the modules follow.
  // @req REQ-132
  it("claims no axis for the project pages", () => {
    expect(getAxisForPage("about")).toBeNull();
    expect(getAxisForPage("doctrine")).toBeNull();
  });
});
