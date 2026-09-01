import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  RELOCATED_SEGMENTS,
  RENAMED_HUB_SEGMENTS,
  RENAMED_MODULE_PATHS,
  resolveRelocatedPath,
  resolveRenamedModulePath,
} from "@/middleware";
import {
  PAGE_TYPES,
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";

/**
 * What the redirect tables owe, stated where reading them cannot establish it.
 *
 * A redirect table is a data structure whose failure modes are all one step
 * removed from its contents: an entry is wrong not because it looks wrong but
 * because of where it *lands*, and whether landing there starts the walk over
 * again. Three properties matter, and none is visible by inspection:
 *
 *   · **One hop.** A 308 passes on the old URL's standing; a chain of two
 *     spends it twice, and the second hop is usually one we created by
 *     forgetting what the first request said.
 *   · **No loop.** A target opening on a segment that is itself a key is a
 *     redirect that redirects, which browsers answer with an error page and
 *     crawlers answer by leaving.
 *   · **On-origin.** A browser reads `//host` as the start of an authority,
 *     so an identifier forwarded raw turns a redirect into an open one.
 *
 * The suite walks the tables rather than sampling them, so an entry added
 * later inherits the assertions instead of needing its own.
 */

const path = (target: string) =>
  resolveRelocatedPath(target, new URLSearchParams());

const firstSegment = (target: string) => target.split("/").filter(Boolean)[1];

describe("the relocation table lands in one hop", () => {
  // @req REQ-091
  it("moves every legacy segment to a path that is not itself relocated", () => {
    for (const segment of Object.keys(RELOCATED_SEGMENTS)) {
      const once = path(`/fr/${segment}`);
      expect(once, segment).not.toBeNull();

      // The defining property: feeding the answer back in must change
      // nothing. A second answer here is a second round-trip in a browser.
      expect(path(once!.path), `${segment} redirects twice`).toBeNull();
    }
  });

  // @req REQ-091
  it("carries the tail verbatim, however deep", () => {
    expect(path("/fr/peuples/PPL_YORUBA/liens")!.path).toBe(
      "/fr/explorer/peuples/PPL_YORUBA/liens"
    );
    // Percent-encoding survives: it was in the link the reader followed.
    expect(path("/fr/peuples/PPL_%2FEVIL")!.path).toBe(
      "/fr/explorer/peuples/PPL_%2FEVIL"
    );
    // A pinned revision is a tail like any other.
    expect(path("/fr/pays/BEN@v3")!.path).toBe("/fr/explorer/pays/BEN@v3");
  });

  // @req REQ-091
  it("treats a trailing slash as no tail at all", () => {
    expect(path("/fr/pays/")!.path).toBe("/fr/explorer/pays");
  });
});

describe("the module-rename table lands in one hop (ETNI-1458)", () => {
  // @req REQ-091
  it("moves the old nested path to a path that is not itself relocated", () => {
    for (const oldPath of Object.keys(RENAMED_MODULE_PATHS)) {
      const once = resolveRenamedModulePath(`/fr/${oldPath}`);
      expect(once, oldPath).not.toBeNull();

      // The defining property, same as the flat table above: feeding the
      // answer back in must change nothing.
      expect(
        resolveRenamedModulePath(once!),
        `${oldPath} redirects twice`
      ).toBeNull();
      expect(path(once!), `${oldPath} re-enters the flat table too`).toBeNull();
    }
  });

  // @req REQ-091
  it("carries the tail verbatim below the renamed module", () => {
    expect(resolveRenamedModulePath("/fr/comprendre/noms/PPL_YORUBA")).toBe(
      "/fr/comprendre/appellations/PPL_YORUBA"
    );
  });

  // @req REQ-091
  it("treats a trailing slash as no tail at all", () => {
    expect(resolveRenamedModulePath("/fr/comprendre/noms/")).toBe(
      "/fr/comprendre/appellations"
    );
  });

  // @req REQ-091
  it("has a page file behind the renamed module", () => {
    for (const destination of Object.values(RENAMED_MODULE_PATHS)) {
      const route = resolve(
        __dirname,
        "../app/[lang]",
        destination,
        "page.tsx"
      );
      expect(existsSync(route), `${destination} has no page.tsx`).toBe(true);
    }
  });

  // The flat legacy address (/fr/noms) and the nested one it once redirected
  // to must now agree on the same destination, or a reader following either
  // one lands somewhere different from the other.
  // @req REQ-091
  it("agrees with the flat legacy table on where the module now lives", () => {
    expect(path("/fr/noms")!.path).toBe(
      resolveRenamedModulePath("/fr/comprendre/noms")
    );
  });
});

describe("no target re-enters either table", () => {
  // @req REQ-091
  it("never opens a relocation target on a segment that is a key", () => {
    const keys = new Set([
      ...Object.keys(RELOCATED_SEGMENTS),
      ...Object.keys(RENAMED_HUB_SEGMENTS),
    ]);

    for (const [segment, destination] of Object.entries(RELOCATED_SEGMENTS)) {
      const opensOn = destination.split("/")[0];
      expect(keys.has(opensOn), `${segment} -> ${destination}`).toBe(false);
    }
  });

  // @req REQ-114
  it("never opens a hub-rename target on a segment that is a key", () => {
    const keys = new Set([
      ...Object.keys(RELOCATED_SEGMENTS),
      ...Object.keys(RENAMED_HUB_SEGMENTS),
    ]);

    for (const [segment, destination] of Object.entries(RENAMED_HUB_SEGMENTS)) {
      expect(keys.has(destination.split("/")[0]), segment).toBe(false);
    }
  });

  /**
   * The same "does anything answer at the other end" question the relocation
   * targets already face, asked of the hub table — and the reason this suite
   * gained an entry. The three targets were the axis landing pages, and
   * ETNI-1555 deleted them: every hub redirect was a 308 into a 404, which
   * reads to a crawler as a permanent move to nothing.
   */
  // @req REQ-114
  it("has a page file behind every hub-rename target", () => {
    for (const destination of new Set(Object.values(RENAMED_HUB_SEGMENTS))) {
      const route = resolve(
        __dirname,
        "../app/[lang]",
        destination,
        "page.tsx"
      );
      expect(existsSync(route), `${destination} has no page.tsx`).toBe(true);
    }
  });

  /**
   * The live routes are the other half of the same question: a page the site
   * serves must not be swept up by a table meant for pages it no longer
   * serves. `/fr/explorer/peuples` opens on `explorer`, which is why the
   * modules had to nest under a *verb* rather than keep their own first
   * segment.
   */
  // @req REQ-091
  it("leaves every page the site actually serves alone", () => {
    for (const page of PAGE_TYPES) {
      const route = getLocalizedRoute("fr", page);
      expect(path(route), route).toBeNull();
    }
  });
});

describe("every target is a route the app actually serves", () => {
  /**
   * The half of "no dead redirect" that no amount of reading the table can
   * establish: whether anything answers at the other end.
   *
   * This is not hypothetical. The families directory lived in the
   * `[lang]/[section]` catch-all rather than in a page of its own, so deleting
   * that route removed it — while the table above went on pointing at
   * `/fr/explorer/familles`. Every suite stayed green, because a redirect test
   * proves where a request is sent, never that the destination exists.
   */
  /**
   * `regards` is a container, not a page: it holds one article and has never
   * answered anything itself, before the move or after. It is in the table so
   * that `/fr/regards/colonisation-et-resistances` keeps resolving — the tail
   * is the whole point of the entry, and the bare root 404s either way.
   */
  const CONTAINER_ONLY = new Set(["comprendre/regards"]);

  // @req REQ-091
  it("has a page file behind every relocation target", () => {
    for (const destination of new Set(Object.values(RELOCATED_SEGMENTS))) {
      if (CONTAINER_ONLY.has(destination)) continue;

      const route = resolve(
        __dirname,
        "../app/[lang]",
        destination,
        "page.tsx"
      );
      expect(existsSync(route), `${destination} has no page.tsx`).toBe(true);
    }
  });

  // @req REQ-091
  it("still lands the article below the one container segment", () => {
    expect(
      existsSync(
        resolve(
          __dirname,
          "../app/[lang]",
          `${getLocalizedRoute("fr", "colonization").replace("/fr/", "")}`,
          "page.tsx"
        )
      )
    ).toBe(true);
  });
});

describe("a deep link reaches its fiche in one hop", () => {
  // @req REQ-091
  it("resolves the retired directory query straight to the fiche", () => {
    const country = resolveRelocatedPath(
      "/fr/pays",
      new URLSearchParams("country=BEN")
    );
    expect(country).toEqual({
      path: getCountryRoute("fr", "BEN"),
      keepQuery: false,
    });

    const people = resolveRelocatedPath(
      "/fr/peuples",
      new URLSearchParams("people=PPL_YORUBA")
    );
    expect(people!.path).toBe(getPeopleRoute("fr", "PPL_YORUBA"));

    const family = resolveRelocatedPath(
      "/fr/familles",
      new URLSearchParams("family=FLG_BANTU")
    );
    expect(family!.path).toBe(getFamilyRoute("fr", "FLG_BANTU"));
  });

  // The V1 vocabularies carried the same query shapes, so they get the same
  // single hop rather than one into the directory and one out of it.
  // @req REQ-091
  it("does the same for the retired V1 vocabularies", () => {
    expect(
      resolveRelocatedPath(
        "/fr/ethnies",
        new URLSearchParams("people=PPL_FON")
      )!.path
    ).toBe(getPeopleRoute("fr", "PPL_FON"));
    expect(
      resolveRelocatedPath(
        "/fr/regions",
        new URLSearchParams("family=FLG_MANDE")
      )!.path
    ).toBe(getFamilyRoute("fr", "FLG_MANDE"));
  });

  // @req REQ-091
  it("encodes the identifier, so a crafted query cannot leave the site", () => {
    const hostile = resolveRelocatedPath(
      "/fr/pays",
      new URLSearchParams("country=//evil.com")
    );

    expect(hostile!.path).toBe("/fr/explorer/pays/%2F%2Fevil.com");
    // The property the encoding exists for: the second character is not a
    // slash, so a browser reads a path rather than an authority.
    expect(hostile!.path.startsWith("//")).toBe(false);
    expect(firstSegment(hostile!.path)).toBe("explorer");
  });

  // A query naming nothing is left for the page to read.
  // @req REQ-091
  it("falls back to the plain relocation when the query names no fiche", () => {
    const listing = resolveRelocatedPath(
      "/fr/peuples",
      new URLSearchParams("tri=population")
    );

    expect(listing).toEqual({
      path: getLocalizedRoute("fr", "peoples"),
      keepQuery: true,
    });
  });

  // Below the directory root the query belongs to the fiche, not to us.
  // @req REQ-091
  it("does not read a query hanging off a path deeper than the root", () => {
    const deep = resolveRelocatedPath(
      "/fr/peuples/PPL_YORUBA",
      new URLSearchParams("people=PPL_ZULU")
    );

    expect(deep).toEqual({
      path: getPeopleRoute("fr", "PPL_YORUBA"),
      keepQuery: true,
    });
  });
});

describe("the V1 vocabularies the deleted [section] route used to answer", () => {
  // The client-side redirect they lived in went out with `[lang]/[section]`.
  // Left uncarried they would 404 in silence, which is the one outcome a
  // deletion must not produce for an address that used to resolve.
  // @req REQ-091
  it("still resolves, each to the entity its vocabulary became", () => {
    for (const segment of ["regions", "regiones", "regioes"]) {
      expect(path(`/fr/${segment}`)!.path, segment).toBe(
        getLocalizedRoute("fr", "families")
      );
    }
    for (const segment of ["ethnicities", "ethnies", "etnias"]) {
      expect(path(`/fr/${segment}`)!.path, segment).toBe(
        getLocalizedRoute("fr", "peoples")
      );
    }
  });

  // @req REQ-091
  it("keeps the identifier a V1 detail URL carried", () => {
    expect(path("/fr/ethnies/PPL_YORUBA")!.path).toBe(
      getPeopleRoute("fr", "PPL_YORUBA")
    );
    expect(path("/fr/regions/FLG_BANTU")!.path).toBe(
      getFamilyRoute("fr", "FLG_BANTU")
    );
  });
});
