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
 * Measured on a dev server, not assumed: `/fr/explorer/peuples/PPL_INEXISTANT`
 * answers 200. Nothing may join this list — the assertion below is what stops
 * the next loading.tsx from quietly turning another 404 into a soft one.
 */
const GRANDFATHERED_SOFT_404_SEGMENTS = [
  "explorer/familles/[slug]",
  "explorer/pays/[slug]",
  "explorer/peuples/[slug]",
];

describe("every wait on the site is the same wait (REQ-104)", () => {
  // @req REQ-104
  it("serves every route's wait through one of the two loading screens", () => {
    const files = loadingFiles();
    expect(files.length).toBeGreaterThan(0);

    const bespoke = files.filter((file) => {
      const source = read(file);
      return (
        !source.includes("PageLoadingScreen") &&
        !source.includes("FicheLoadingScreen")
      );
    });

    expect(bespoke.map(segmentOf)).toEqual([]);
  });

  // @req REQ-113
  it("spends every one of those waits on a Saviez-vous fact", () => {
    const page = read(
      join(process.cwd(), "src/components/system/PageLoadingScreen.tsx")
    );
    const fiche = read(
      join(process.cwd(), "src/components/fiche/FicheLoadingScreen.tsx")
    );

    expect(page).toContain("DidYouKnowLoader");
    expect(fiche).toContain("DidYouKnowLoader");
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
