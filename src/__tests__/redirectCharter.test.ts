import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  RELOCATED_SEGMENTS,
  RENAMED_HUB_SEGMENTS,
  RENAMED_MODULE_PATHS,
  resolveCanonicalDeepLink,
  resolveRelocatedPath,
  resolveRenamedModulePath,
} from "@/middleware";
import { LOCALES } from "@/lib/locale";
import {
  NOMMER_CHAPTER_KEYS,
  PAGE_TYPES,
  STATIC_PAGE_SLUGS,
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getNommerChapterRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
  getPersonRoute,
  getStaticPageRoute,
  localeSlugMismatch,
  toRouteFilePath,
} from "@/lib/routing";
import type { Language } from "@/types/shared";

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
 * later inherits the assertions instead of needing its own. Since DEC-049
 * the tables carry one side per locale, derived from the French one, and
 * every walk runs under both: a retired address requested under `/en` must
 * land on the English successor, in the same one hop, and never cross into
 * `/fr` on the way.
 */

const path = (target: string) =>
  resolveRelocatedPath(target, new URLSearchParams());

const firstSegment = (target: string) => target.split("/").filter(Boolean)[1];

const under = (language: Language, segment: string) =>
  "/" + language + "/" + segment;

/**
 * The route file behind a public destination. English destinations are served
 * off the French folders through the middleware rewrite, so the question
 * "does anything answer at the other end" has to be asked of the folder the
 * rewrite lands on, not of the English words.
 */
const routeFile = (language: Language, destination: string) => {
  const publicPath = under(language, destination);
  const folderPath = toRouteFilePath(publicPath) ?? publicPath;
  return resolve(
    __dirname,
    "../app/[lang]",
    folderPath.slice(`/${language}/`.length),
    "page.tsx"
  );
};

describe("the relocation table lands in one hop", () => {
  // @req REQ-091
  it("moves every legacy segment to a path that is not itself relocated", () => {
    for (const language of LOCALES) {
      for (const segment of Object.keys(RELOCATED_SEGMENTS[language])) {
        const once = path(under(language, segment));
        expect(once, `${language}/${segment}`).not.toBeNull();

        // The defining property: feeding the answer back in must change
        // nothing. A second answer here is a second round-trip in a browser.
        expect(
          path(once!.path),
          `${language}/${segment} redirects twice`
        ).toBeNull();
      }
    }
  });

  // A retired address under one locale resolves within that locale. Crossing
  // over would hand an English reader a French page, and the middleware would
  // then owe a second redirect to bring them back.
  // @req REQ-141
  it("never crosses locales", () => {
    for (const language of LOCALES) {
      for (const segment of Object.keys(RELOCATED_SEGMENTS[language])) {
        expect(path(under(language, segment))!.path).toMatch(
          new RegExp(`^/${language}/`)
        );
      }
      for (const oldPath of Object.keys(RENAMED_MODULE_PATHS[language])) {
        expect(resolveRenamedModulePath(under(language, oldPath))).toMatch(
          new RegExp(`^/${language}/`)
        );
      }
    }
  });

  // @req REQ-091
  it("carries the tail verbatim, however deep", () => {
    for (const language of LOCALES) {
      const peoples = getLocalizedRoute(language, "peoples");
      const countries = getLocalizedRoute(language, "countries");

      expect(path(under(language, "peuples/PPL_YORUBA/liens"))!.path).toBe(
        `${peoples}/PPL_YORUBA/liens`
      );
      // Percent-encoding survives: it was in the link the reader followed.
      expect(path(under(language, "peuples/PPL_%2FEVIL"))!.path).toBe(
        `${peoples}/PPL_%2FEVIL`
      );
      // A pinned revision is a tail like any other.
      expect(path(under(language, "pays/BEN@v3"))!.path).toBe(
        `${countries}/BEN@v3`
      );
    }
  });

  // @req REQ-091
  it("treats a trailing slash as no tail at all", () => {
    for (const language of LOCALES) {
      expect(path(under(language, "pays/"))!.path).toBe(
        getLocalizedRoute(language, "countries")
      );
    }
  });

  // ETNI-1615 (REQ-138): every currently-published address under the retired
  // verb prefix — hub, facet or fiche, at any depth — has to keep resolving,
  // in one hop, to its noun-prefixed successor. One row per axis carries all
  // of it; this asserts the row actually does. The tail is carried verbatim
  // in both locales — the French word under `/en` is the cross-vocabulary
  // step's to translate, inside the same 308 (middleware.test.ts).
  // @req REQ-091
  it("carries every depth of the retired axis prefix to its successor", () => {
    for (const language of LOCALES) {
      const atlas = getLocalizedRoute(language, "atlasHub");
      const games = getLocalizedRoute(language, "jeuxHub");

      expect(path(under(language, "explorer"))!.path).toBe(atlas);
      expect(path(under(language, "comprendre"))!.path).toBe(
        getLocalizedRoute(language, "dossiersHub")
      );
      expect(path(under(language, "jouer"))!.path).toBe(games);
      expect(path(under(language, "explorer/peuples"))!.path).toBe(
        `${atlas}/peuples`
      );
      expect(path(under(language, "explorer/peuples/PPL_YORUBA"))!.path).toBe(
        `${atlas}/peuples/PPL_YORUBA`
      );
      expect(path(under(language, "jouer/mercator"))!.path).toBe(
        `${games}/mercator`
      );
    }
  });
});

describe("the module-rename table lands in one hop (ETNI-1458)", () => {
  // @req REQ-091
  it("moves the old nested path to a path that is not itself relocated", () => {
    for (const language of LOCALES) {
      for (const oldPath of Object.keys(RENAMED_MODULE_PATHS[language])) {
        const once = resolveRenamedModulePath(under(language, oldPath));
        expect(once, `${language}/${oldPath}`).not.toBeNull();

        // The defining property, same as the flat table above: feeding the
        // answer back in must change nothing.
        expect(
          resolveRenamedModulePath(once!),
          `${language}/${oldPath} redirects twice`
        ).toBeNull();
        expect(
          path(once!),
          `${language}/${oldPath} re-enters the flat table too`
        ).toBeNull();
      }
    }
  });

  // @req REQ-091
  it("carries the tail verbatim below the renamed module", () => {
    for (const language of LOCALES) {
      expect(
        resolveRenamedModulePath(under(language, "dossiers/noms/PPL_YORUBA"))
      ).toBe(`${getLocalizedRoute(language, "names")}/PPL_YORUBA`);
    }
  });

  // @req REQ-091
  it("treats a trailing slash as no tail at all", () => {
    for (const language of LOCALES) {
      expect(resolveRenamedModulePath(under(language, "dossiers/noms/"))).toBe(
        getLocalizedRoute(language, "names")
      );
    }
  });

  // Appellations was published under Comprendre before ETNI-1453 made the
  // name a corpus entity and moved it to Explorer (now Atlas). The address it
  // was published under has to reach the new one directly: chaining it
  // through `dossiers/noms` would spend the 308 twice.
  // @req REQ-114
  it("sends both published appellations addresses to Atlas in one hop", () => {
    for (const language of LOCALES) {
      const names = getLocalizedRoute(language, "names");
      expect(
        resolveRenamedModulePath(under(language, "dossiers/appellations"))
      ).toBe(names);
      expect(resolveRenamedModulePath(under(language, "dossiers/noms"))).toBe(
        names
      );
    }
  });

  // Doctrine leaves the axes with About: a page no axis lists carries no
  // prefix, the rule `compare` already follows.
  // @req REQ-114
  it("lifts the doctrine subtree back to the top level", () => {
    for (const language of LOCALES) {
      const doctrine = getLocalizedRoute(language, "doctrine");
      expect(
        resolveRenamedModulePath(under(language, "dossiers/doctrine"))
      ).toBe(doctrine);
      expect(
        resolveRenamedModulePath(
          under(language, "dossiers/doctrine/endonymes-vs-exonymes")
        )
      ).toBe(`${doctrine}/endonymes-vs-exonymes`);
      // And the address it lands on is served, not relocated again.
      expect(path(doctrine)).toBeNull();
    }
  });

  // @req REQ-091
  it("has a page file behind the renamed module", () => {
    for (const language of LOCALES) {
      for (const destination of Object.values(RENAMED_MODULE_PATHS[language])) {
        expect(
          existsSync(routeFile(language, destination)),
          `${language}/${destination} has no page.tsx`
        ).toBe(true);
      }
    }
  });

  // The flat legacy address (/fr/noms) and the nested one it once redirected
  // to must now agree on the same destination, or a reader following either
  // one lands somewhere different from the other.
  // @req REQ-091
  it("agrees with the flat legacy table on where the module now lives", () => {
    for (const language of LOCALES) {
      expect(path(under(language, "noms"))!.path).toBe(
        resolveRenamedModulePath(under(language, "dossiers/noms"))
      );
    }
  });
});

describe("no target re-enters either table", () => {
  const keysOf = (language: Language) =>
    new Set([
      ...Object.keys(RELOCATED_SEGMENTS[language]),
      ...Object.keys(RENAMED_HUB_SEGMENTS[language]),
    ]);

  // @req REQ-091
  it("never opens a relocation target on a segment that is a key", () => {
    for (const language of LOCALES) {
      const keys = keysOf(language);
      for (const [segment, destination] of Object.entries(
        RELOCATED_SEGMENTS[language]
      )) {
        const opensOn = destination.split("/")[0];
        expect(
          keys.has(opensOn),
          `${language}: ${segment} -> ${destination}`
        ).toBe(false);
      }
    }
  });

  // @req REQ-114
  it("never opens a hub-rename target on a segment that is a key", () => {
    for (const language of LOCALES) {
      const keys = keysOf(language);
      for (const [segment, destination] of Object.entries(
        RENAMED_HUB_SEGMENTS[language]
      )) {
        expect(
          keys.has(destination.split("/")[0]),
          `${language}: ${segment}`
        ).toBe(false);
      }
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
    for (const language of LOCALES) {
      for (const destination of new Set(
        Object.values(RENAMED_HUB_SEGMENTS[language])
      )) {
        expect(
          existsSync(routeFile(language, destination)),
          `${language}/${destination} has no page.tsx`
        ).toBe(true);
      }
    }
  });

  /**
   * The live routes are the other half of the same question: a page the site
   * serves must not be swept up by a table meant for pages it no longer
   * serves. `/fr/atlas/peuples` opens on `atlas`, which is why the
   * modules had to nest under a *verb* (now a noun) rather than keep their
   * own first segment.
   */
  // @req REQ-091
  it("leaves every page the site actually serves alone", () => {
    for (const language of LOCALES) {
      for (const page of PAGE_TYPES) {
        const route = getLocalizedRoute(language, page);
        expect(path(route), route).toBeNull();
        expect(resolveRenamedModulePath(route), route).toBeNull();
        // Its own vocabulary, so the cross-vocabulary step has nothing to say.
        expect(localeSlugMismatch(route), route).toBeNull();
      }
    }
  });

  // The cross-vocabulary answer is itself final: sending it back through the
  // step must change nothing, or `/en/atlas/pays` would bounce between the
  // two vocabularies.
  // @req REQ-141
  it("settles a foreign-vocabulary path in one step", () => {
    for (const language of LOCALES) {
      for (const other of LOCALES) {
        if (other === language) continue;
        for (const page of PAGE_TYPES) {
          const foreign = under(
            language,
            getLocalizedRoute(other, page).slice(`/${other}/`.length)
          );
          const own = localeSlugMismatch(foreign);
          if (own === null) continue;
          expect(own, foreign).toBe(getLocalizedRoute(language, page));
          expect(localeSlugMismatch(own), foreign).toBeNull();
        }
      }
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
   *
   * The three bare axis roots are the same shape, for the same reason
   * ETNI-1555 gave them: an access mode is a non-navigating heading, never a
   * destination, so it was never given a `page.tsx` of its own — before this
   * rename or after. `explorer`/`comprendre`/`jouer` are single-segment keys
   * in `RELOCATED_SEGMENTS` precisely so every *tail* below them keeps
   * resolving in one hop; the bare root carries no tail and 404s either way.
   *
   * Named through the slug table so the set holds in both vocabularies.
   */
  const containerOnly = (language: Language) =>
    new Set(
      [
        RELOCATED_SEGMENTS[language].regards,
        ...(["atlasHub", "dossiersHub", "jeuxHub"] as const).map((hub) =>
          getLocalizedRoute(language, hub).slice(`/${language}/`.length)
        ),
      ].filter(Boolean)
    );

  // @req REQ-091
  it("has a page file behind every relocation target", () => {
    for (const language of LOCALES) {
      const containers = containerOnly(language);
      for (const destination of new Set(
        Object.values(RELOCATED_SEGMENTS[language])
      )) {
        if (containers.has(destination)) continue;

        expect(
          existsSync(routeFile(language, destination)),
          `${language}/${destination} has no page.tsx`
        ).toBe(true);
      }
    }
  });

  // @req REQ-091
  it("still lands the article below the one container segment", () => {
    for (const language of LOCALES) {
      expect(
        existsSync(
          routeFile(
            language,
            getLocalizedRoute(language, "colonization").slice(
              `/${language}/`.length
            )
          )
        )
      ).toBe(true);
    }
  });

  /**
   * The rewrite is what makes an English address answer at all, so its
   * coverage is a filesystem question: every path the English vocabulary can
   * compose has to land on a folder Next actually has. A slug added to the
   * English table with no French folder behind it is a 404 that no redirect
   * test would ever see.
   *
   * `atlas/persons` is exempt by name: no person page exists in either locale
   * today (REQ-126 composes the route ahead of the page), which predates the
   * English vocabulary and is not its failure.
   */
  // @req REQ-141
  it("rewrites every English path onto a folder that exists", () => {
    const folder = (publicPath: string) =>
      resolve(
        __dirname,
        "../app/[lang]",
        (toRouteFilePath(publicPath) ?? publicPath).slice("/en/".length)
      );

    const englishPaths = [
      ...PAGE_TYPES.map((page) => getLocalizedRoute("en", page)),
      ...NOMMER_CHAPTER_KEYS.map((chapter) =>
        getNommerChapterRoute("en", chapter)
      ),
      ...(
        Object.keys(
          STATIC_PAGE_SLUGS.en
        ) as (keyof typeof STATIC_PAGE_SLUGS.en)[]
      ).map((key) => getStaticPageRoute("en", key)),
      // The dynamic segment is named as the folder names it, so the
      // rewritten path is the folder path itself.
      getPeopleLinksRoute("en", "[slug]"),
    ];

    for (const publicPath of englishPaths) {
      expect(existsSync(folder(publicPath)), publicPath).toBe(true);
    }

    expect(existsSync(folder(getPersonRoute("en", "[slug]")))).toBe(false);
  });
});

describe("a deep link reaches its fiche in one hop", () => {
  // @req REQ-091
  it("resolves the retired directory query straight to the fiche", () => {
    for (const language of LOCALES) {
      const country = resolveRelocatedPath(
        under(language, "pays"),
        new URLSearchParams("country=BEN")
      );
      expect(country).toEqual({
        path: getCountryRoute(language, "BEN"),
        keepQuery: false,
      });

      const people = resolveRelocatedPath(
        under(language, "peuples"),
        new URLSearchParams("people=PPL_YORUBA")
      );
      expect(people!.path).toBe(getPeopleRoute(language, "PPL_YORUBA"));

      const family = resolveRelocatedPath(
        under(language, "familles"),
        new URLSearchParams("family=FLG_BANTU")
      );
      expect(family!.path).toBe(getFamilyRoute(language, "FLG_BANTU"));
    }
  });

  // A link made since the move carries the current address, and the fiche has
  // to be reached from there too. The directory page cannot do it: it sits
  // behind a `loading.tsx`, so its shell streams with a 200 and the redirect
  // degrades into a client-side hop — a 200 for the crawler, and a document
  // whose scripts carry a nonce the first response never authorised.
  // @req REQ-091
  it("resolves the query on the directory's current address too", () => {
    for (const language of LOCALES) {
      expect(
        resolveCanonicalDeepLink(
          getLocalizedRoute(language, "countries"),
          new URLSearchParams("country=BEN")
        )
      ).toBe(getCountryRoute(language, "BEN"));

      expect(
        resolveCanonicalDeepLink(
          getLocalizedRoute(language, "peoples"),
          new URLSearchParams("people=PPL_YORUBA")
        )
      ).toBe(getPeopleRoute(language, "PPL_YORUBA"));

      expect(
        resolveCanonicalDeepLink(
          `${getLocalizedRoute(language, "families")}/`,
          new URLSearchParams("family=FLG_BANTU")
        )
      ).toBe(getFamilyRoute(language, "FLG_BANTU"));
    }
  });

  // The encoding rule is the resolvers' own, so it holds on this path as well
  // — two leading slashes are what turns a redirect into an open one.
  // @req REQ-091
  it("encodes a hostile identifier on the current address", () => {
    for (const language of LOCALES) {
      expect(
        resolveCanonicalDeepLink(
          getLocalizedRoute(language, "countries"),
          new URLSearchParams("country=//evil.com")
        )
      ).toBe(getCountryRoute(language, encodeURIComponent("//evil.com")));
    }
  });

  // The fiche itself is not a directory: resolving there would send a reader
  // who is already on the page back to it, which is the shape a loop takes.
  // @req REQ-091
  it("leaves a fiche and an unqueried directory alone", () => {
    for (const language of LOCALES) {
      expect(
        resolveCanonicalDeepLink(
          getCountryRoute(language, "BEN"),
          new URLSearchParams("country=COM")
        )
      ).toBeNull();

      expect(
        resolveCanonicalDeepLink(
          getLocalizedRoute(language, "countries"),
          new URLSearchParams()
        )
      ).toBeNull();
    }
  });

  // The V1 vocabularies carried the same query shapes, so they get the same
  // single hop rather than one into the directory and one out of it.
  // @req REQ-091
  it("does the same for the retired V1 vocabularies", () => {
    for (const language of LOCALES) {
      expect(
        resolveRelocatedPath(
          under(language, "ethnies"),
          new URLSearchParams("people=PPL_FON")
        )!.path
      ).toBe(getPeopleRoute(language, "PPL_FON"));
      expect(
        resolveRelocatedPath(
          under(language, "regions"),
          new URLSearchParams("family=FLG_MANDE")
        )!.path
      ).toBe(getFamilyRoute(language, "FLG_MANDE"));
    }
  });

  // @req REQ-091
  it("encodes the identifier, so a crafted query cannot leave the site", () => {
    for (const language of LOCALES) {
      const hostile = resolveRelocatedPath(
        under(language, "pays"),
        new URLSearchParams("country=//evil.com")
      );

      expect(hostile!.path).toBe(getCountryRoute(language, "%2F%2Fevil.com"));
      // The property the encoding exists for: the second character is not a
      // slash, so a browser reads a path rather than an authority.
      expect(hostile!.path.startsWith("//")).toBe(false);
      expect(firstSegment(hostile!.path)).toBe("atlas");
    }
  });

  // A query naming nothing is left for the page to read.
  // @req REQ-091
  it("falls back to the plain relocation when the query names no fiche", () => {
    for (const language of LOCALES) {
      const listing = resolveRelocatedPath(
        under(language, "peuples"),
        new URLSearchParams("tri=population")
      );

      expect(listing).toEqual({
        path: getLocalizedRoute(language, "peoples"),
        keepQuery: true,
      });
    }
  });

  // Below the directory root the query belongs to the fiche, not to us.
  // @req REQ-091
  it("does not read a query hanging off a path deeper than the root", () => {
    for (const language of LOCALES) {
      const deep = resolveRelocatedPath(
        under(language, "peuples/PPL_YORUBA"),
        new URLSearchParams("people=PPL_ZULU")
      );

      expect(deep).toEqual({
        path: getPeopleRoute(language, "PPL_YORUBA"),
        keepQuery: true,
      });
    }
  });
});

describe("the V1 vocabularies the deleted [section] route used to answer", () => {
  // The client-side redirect they lived in went out with `[lang]/[section]`.
  // Left uncarried they would 404 in silence, which is the one outcome a
  // deletion must not produce for an address that used to resolve.
  // @req REQ-091
  it("still resolves, each to the entity its vocabulary became", () => {
    for (const language of LOCALES) {
      for (const segment of ["regions", "regiones", "regioes"]) {
        expect(path(under(language, segment))!.path, segment).toBe(
          getLocalizedRoute(language, "families")
        );
      }
      for (const segment of ["ethnicities", "ethnies", "etnias"]) {
        expect(path(under(language, segment))!.path, segment).toBe(
          getLocalizedRoute(language, "peoples")
        );
      }
    }
  });

  // @req REQ-091
  it("keeps the identifier a V1 detail URL carried", () => {
    for (const language of LOCALES) {
      expect(path(under(language, "ethnies/PPL_YORUBA"))!.path).toBe(
        getPeopleRoute(language, "PPL_YORUBA")
      );
      expect(path(under(language, "regions/FLG_BANTU"))!.path).toBe(
        getFamilyRoute(language, "FLG_BANTU")
      );
    }
  });
});
