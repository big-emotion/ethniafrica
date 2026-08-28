import { describe, expect, it } from "vitest";

import { getModuleHref } from "@/lib/hubs/moduleHref";
import { getLocalizedRoute } from "@/lib/routing";

describe("moduleHref — where a hub module's click lands (REQ-114)", () => {
  // The bug this resolver exists to prevent: a game carries `page: null`
  // by design, so a resolver that only reads `page` renders eleven live
  // games as "Bientôt".
  // @req REQ-114
  it("sends a game to its slug under the jouer hub", () => {
    expect(getModuleHref({ page: null, gameSlug: "mercator" }, "fr")).toBe(
      `${getLocalizedRoute("fr", "jouerHub")}/mercator`
    );
  });

  // @req REQ-114
  it("sends a module that owns a page to its localized route", () => {
    expect(getModuleHref({ page: "peoples" }, "fr")).toBe(
      getLocalizedRoute("fr", "peoples")
    );
  });

  // The quiz is the one jouer module addressed by page rather than slug,
  // so the two branches have to coexist on the same access mode.
  // @req REQ-114
  it("keeps the quiz on its own route rather than under a game slug", () => {
    expect(getModuleHref({ page: "quiz" }, "fr")).toBe(
      getLocalizedRoute("fr", "quiz")
    );
  });

  // @req REQ-114
  it("prefers the slug when a module somehow carries both", () => {
    expect(
      getModuleHref({ page: "quiz", gameSlug: "appellations" }, "fr")
    ).toBe(`${getLocalizedRoute("fr", "jouerHub")}/appellations`);
  });

  // A module with neither is one whose surface isn't wired to any route:
  // it must stay inert rather than become a link to nowhere.
  // @req REQ-114
  it("resolves nothing for a module that has no route at all", () => {
    expect(getModuleHref({ page: null }, "fr")).toBeNull();
  });
});
