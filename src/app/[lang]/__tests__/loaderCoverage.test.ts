import { readFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { globSync } from "tinyglobby";

const APP_ROOT = join(process.cwd(), "src", "app", "[lang]");

const toPosix = (path: string) => path.split(sep).join(posix.sep);

const read = (path: string) => readFileSync(path, "utf8");

const filesUnder = (pattern: string) =>
  globSync(pattern, { cwd: APP_ROOT, absolute: true }).sort();

const loadingFiles = () => filesUnder("**/loading.tsx");

/** The route segment a loading.tsx governs, relative to `[lang]`. */
const segmentOf = (loadingFile: string) =>
  toPosix(relative(APP_ROOT, loadingFile)).replace(/\/?loading\.tsx$/, "");

/**
 * The three fiche routes were already streaming a shell above their own
 * `notFound()` before this suite existed, and they are left alone here: the
 * fix is to move each slug check into a `layout.tsx` at the same segment, so
 * it resolves before the boundary streams, and that is a change to how the
 * fiches fetch rather than to how they wait.
 *
 * Measured on a dev server, not assumed: `/fr/atlas/peuples/PPL_INEXISTANT`
 * answers 200. Nothing may join this list — the assertion below is what stops
 * the next loading.tsx from quietly turning another 404 into a soft one.
 */
const GRANDFATHERED_SOFT_404_SEGMENTS = [
  "atlas/familles/[slug]",
  "atlas/pays/[slug]",
  "atlas/peuples/[slug]",
  "atlas/langues/[slug]",
  // The patronyme fiche, which moved off `atlas/appellations/[slug]` when
  // DEC-038's two objects stopped sharing a URL prefix. Same route, same
  // pre-existing soft 404 — a rename, not a new entry.
  "atlas/noms/[slug]",
];

/**
 * The three wait screens, and the slot each one fills.
 *
 * They are three rather than one because a fallback is rendered *where its
 * boundary sits*, and the site has three such places: a whole page, a fiche
 * opening on the night band, and the reading panel inside `FacetHubShell`,
 * which keeps its own header and globe mounted above the slot. A screen used
 * in the wrong one duplicates chrome the reader is still looking at — which
 * is what the facets did before `FacetPanelLoading` existed.
 */
const WAIT_SCREENS = {
  PageLoadingScreen: "src/components/system/PageLoadingScreen.tsx",
  FicheLoadingScreen: "src/components/fiche/FicheLoadingScreen.tsx",
  FacetPanelLoading: "src/components/hubs/facets/FacetPanelLoading.tsx",
} as const;

/**
 * The waits no route boundary can reach, because what they wait for is
 * fetched after the page has rendered.
 *
 * They are audited beside the three above rather than among them: a
 * `loading.tsx` importing one of these would be covering a route wait with an
 * island's screen, which is not the same slot. The quiz session was the hole
 * this list exists for — it shipped a bare continent, with no fact and no
 * accent scope, and the gate below only ever looked at `loading.tsx` files.
 */
const CLIENT_ISLAND_WAIT_SCREENS = {
  QuizSessionWait: "src/components/quiz/QuizSessionWait.tsx",
} as const;

/**
 * Matched on the import rather than anywhere in the file: a loading file that
 * merely *names* a screen in a comment explaining why it does not use it read
 * as covered, and one of them passed this gate that way.
 */
const IMPORTS_A_WAIT_SCREEN = new RegExp(
  `^import[^;]*\\b(${Object.keys(WAIT_SCREENS).join("|")})\\b`,
  "m"
);

describe("every wait on the site is the same wait (REQ-104)", () => {
  // @req REQ-104
  it("serves every route's wait through one of the three loading screens", () => {
    const files = loadingFiles();
    expect(files.length).toBeGreaterThan(0);

    const bespoke = files.filter(
      (file) => !IMPORTS_A_WAIT_SCREEN.test(read(file))
    );

    expect(bespoke.map(segmentOf)).toEqual([]);
  });

  // @req REQ-113
  it("spends every one of those waits on a Saviez-vous fact", () => {
    const screens = [
      ...Object.values(WAIT_SCREENS),
      ...Object.values(CLIENT_ISLAND_WAIT_SCREENS),
    ];

    for (const path of screens) {
      expect(read(join(process.cwd(), path))).toContain("DidYouKnowLoader");
    }
  });

  /**
   * One wait, one shape (brand charter §8.4).
   *
   * The three screens drifted apart until a single click produced two
   * different waits depending on whether the segment happened to own a
   * `loading.tsx`: the client overlay painted the fact alone, while the two
   * server screens painted a title plate, a trail and — on a fiche — a night
   * stage the height of the globe, which together took the whole fold and
   * left the fact unread.
   *
   * `sectionName` is what named the plate, so its absence is what the gate
   * reads: a wait screen that accepts one is a wait screen that can paint a
   * page the reader has not arrived at.
   *
   * The band is matched on its *import* rather than anywhere in the file, the
   * lesson the coverage assertion above already learned: `FicheLoadingScreen`
   * names `FicheHeroBand` in the comment recording why it no longer raises
   * one, and a gate reading the whole source calls that a violation.
   */
  // @req REQ-113
  it("gives every wait the same shape: the fact, and no page identity", () => {
    const screens = [
      ...Object.values(WAIT_SCREENS),
      ...Object.values(CLIENT_ISLAND_WAIT_SCREENS),
    ];

    for (const path of screens) {
      const source = read(join(process.cwd(), path));

      expect(source).not.toMatch(/\bsectionName\b/);
      expect(source).not.toMatch(/^import[^;]*\bFicheHeroBand\b/m);
    }
  });

  /**
   * The quiz was rendering the continent outside any `.afh-accent-*` wrapper,
   * where `var(--accent)` resolves to shadcn's bare HSL triplet: `fill` cannot
   * read it and the figure paints black. An island wait carries no surrounding
   * scope of its own — `PageLayout` declares none — so it has to declare one.
   */
  // @req REQ-104
  it("scopes every island wait to an accent, so its continent is inked", () => {
    for (const path of Object.values(CLIENT_ISLAND_WAIT_SCREENS)) {
      expect(read(join(process.cwd(), path))).toMatch(
        /afh-accent-|ACCENT_BY_ACCESS_MODE/
      );
    }
  });

  // @req REQ-104
  it("covers the routes a boundary cannot reach with the client interstitial", () => {
    // The home has no boundary of its own and the routes that can 404 must
    // not be given one, so the overlay is the only thing standing between
    // those navigations and a blank wait. It is mounted once, for all of
    // them, in providers.
    const providers = read(join(process.cwd(), "src/app/providers.tsx"));

    expect(providers).toContain("RouteTransitionLoader");
  });
});

describe("no boundary turns a 404 into a soft 404 (REQ-052)", () => {
  // @req REQ-052
  it("keeps [lang] itself free of a loading file", () => {
    // A boundary here streams a shell above the locale guard, and `/quiz`
    // would answer 200 with the home instead of 404.
    expect(loadingFiles().map(segmentOf)).not.toContain("");
  });

  // @req REQ-052
  it("puts no new boundary above a route that can answer notFound()", () => {
    // The placement rule the repo settled on: a boundary on segment S is safe
    // iff every descendant of S that calls notFound() already declares a
    // nearer one. What makes a route soft-404 is the *nearest* boundary above
    // it — a further one changes nothing that the nearer one has not already
    // done.
    const boundaries = new Set(loadingFiles().map(segmentOf));

    const nearestBoundaryAbove = (route: string) => {
      let segment = route;
      for (;;) {
        if (boundaries.has(segment)) return segment;
        const cut = segment.lastIndexOf("/");
        if (cut < 0) return boundaries.has("") ? "" : null;
        segment = segment.slice(0, cut);
      }
    };

    const offenders = filesUnder("**/page.tsx")
      .filter((file) => read(file).includes("notFound"))
      .map((file) =>
        toPosix(relative(APP_ROOT, file)).replace(/\/?page\.tsx$/, "")
      )
      .map(nearestBoundaryAbove)
      .filter(
        (segment): segment is string =>
          segment !== null && !GRANDFATHERED_SOFT_404_SEGMENTS.includes(segment)
      );

    expect([...new Set(offenders)]).toEqual([]);
  });
});
