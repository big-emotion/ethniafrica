import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";
import { LOCALE } from "./support/locale";

/**
 * The fiche parity contract, measured on the rendered page.
 *
 * Every row here is an invariant of plan v2 §5: it holds on every record, not
 * on the two worked examples. The matrix routes are each here for a data
 * shape (no colonial entry, an index of names, no exonym…); the sweep visits
 * every country and a fixed sample of peoples and checks only the rows a
 * record cannot legitimately vary: one width, one ground, one radius, one
 * gap, left-aligned headings, and no pipeline or identifier text.
 *
 * Pages settle on `load` plus 2.5 s, which is how the height baseline was
 * measured, so the height comparison is like for like.
 */

const baseline = JSON.parse(
  readFileSync(join(process.cwd(), "e2e/fiche-parity.baseline.json"), "utf8")
) as { heights: Record<string, number> };

const FORBIDDEN_TEXT =
  /FLG_[A-Z]|PPL_[A-Z]|Tier resolved|No URL and no recognisable|🏛/;

const MATRIX = Object.keys(baseline.heights);

function corpusIds(directory: string, pattern: RegExp): string[] {
  return (
    readdirSync(join(process.cwd(), directory), { recursive: true }) as string[]
  )
    .map((entry) => entry.split("/").pop()!)
    .filter((file) => pattern.test(file))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
}

/** A deterministic sample, so a failing route can be visited again. */
function sample<T>(items: T[], count: number, seed = 20_260_912): T[] {
  const pool = [...items];
  const picked: T[] = [];
  let state = seed;
  while (picked.length < count && pool.length > 0) {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    picked.push(pool.splice(state % pool.length, 1)[0]);
  }
  return picked;
}

const SWEEP = [
  ...corpusIds("dataset/source/afrik/pays", /^[A-Z]{3}\.json$/).map((iso3) =>
    getCountryRoute(LOCALE, iso3)
  ),
  ...sample(
    corpusIds("dataset/source/afrik/peuples", /^PPL_[A-Z0-9_]+\.json$/),
    60
  ).map((id) => getPeopleRoute(LOCALE, id)),
];

async function openRecord(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "load" });
  expect(response?.status(), path).toBeLessThan(400);
  await page.locator(".afh-parchment").first().waitFor();
  await page.waitForTimeout(2_500);
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const parchment = document.querySelector<HTMLElement>(".afh-parchment")!;
    const children = (Array.from(parchment.children) as HTMLElement[]).filter(
      (child) => child.getBoundingClientRect().height > 0
    );
    const rects = children.map((child) => child.getBoundingClientRect());
    const chapters = Array.from(
      parchment.querySelectorAll<HTMLElement>(":scope > .afh-parchment-section")
    );
    const style = (element: Element) => getComputedStyle(element);
    const tiles = parchment.querySelector(".afh-tiles");
    const tile = parchment.querySelector(".afh-tile");
    const brief = parchment.querySelector<HTMLElement>(".fiche-summary-brief");
    const briefChapter = brief?.closest<HTMLElement>(".afh-parchment-section");
    const peoples = parchment.querySelector(
      '[data-fiche-section="Peuples du pays"]'
    );

    return {
      widths: rects.map((rect) => Math.round(rect.width)),
      gaps: rects
        .slice(1)
        .map((rect, index) => Math.round(rect.top - rects[index].bottom)),
      sectionGap: Number.parseFloat(style(parchment).rowGap),
      grounds: [...new Set(chapters.map((c) => style(c).backgroundColor))],
      radii: [...new Set(chapters.map((c) => style(c).borderTopLeftRadius))],
      headingAligns: [
        ...new Set(
          chapters
            .map((chapter) => chapter.querySelector("h2"))
            .filter((heading): heading is HTMLHeadingElement => !!heading)
            .map((heading) => style(heading).textAlign)
        ),
      ],
      tileGap: tiles ? style(tiles).columnGap : null,
      tilePadding: tile ? style(tile).padding : null,
      briefOverflow:
        brief && briefChapter
          ? Math.abs(
              brief.getBoundingClientRect().width -
                (briefChapter.clientWidth -
                  Number.parseFloat(style(briefChapter).paddingLeft) -
                  Number.parseFloat(style(briefChapter).paddingRight))
            )
          : 0,
      regimes: Array.from(
        parchment.querySelectorAll("ol.afh-chronology li[data-regime]"),
        (station) => station.getAttribute("data-regime")
      ),
      legend: parchment.querySelector("[data-chronology-legend]") !== null,
      peoplesText: peoples?.textContent ?? "",
      text: parchment.textContent ?? "",
      height: document.documentElement.scrollHeight,
    };
  });
}

type Measured = Awaited<ReturnType<typeof measure>>;

/** The rows a record cannot legitimately vary, whatever its data. */
function expectSharedLayout(result: Measured, label: string, width: number) {
  expect(
    Math.max(...result.widths) - Math.min(...result.widths),
    `${label}: parchment children widths ${result.widths.join(", ")}`
  ).toBeLessThanOrEqual(1);
  for (const gap of result.gaps) {
    expect(
      Math.abs(gap - result.sectionGap),
      `${label}: gaps ${result.gaps.join(", ")} against ${result.sectionGap}`
    ).toBeLessThanOrEqual(1);
  }
  expect(result.grounds, `${label}: chapter grounds`).toHaveLength(1);
  expect(result.radii, `${label}: chapter radii`).toHaveLength(1);
  expect(
    Number.parseFloat(result.radii[0]),
    `${label}: radius`
  ).toBeGreaterThan(0);
  if (width < 768) {
    for (const align of result.headingAligns) {
      expect(["start", "left"], `${label}: h2 text-align`).toContain(align);
    }
  }
  expect(result.text, `${label}: reader-visible text`).not.toMatch(
    FORBIDDEN_TEXT
  );
}

test.describe("fiche parity — route matrix", () => {
  test.skip(LOCALE !== "fr", "The matrix reads French routes and copy.");
  test.describe.configure({ mode: "parallel" });

  for (const width of [430, 1440]) {
    for (const path of MATRIX) {
      // @req REQ-091
      test(`${path} holds the parity contract at ${width}px`, async ({
        page,
      }) => {
        test.setTimeout(90_000);
        await page.setViewportSize({ width, height: 932 });
        await openRecord(page, path);
        const result = await measure(page);
        const label = `${path} @${width}`;

        expectSharedLayout(result, label, width);
        if (path.includes("/familles/")) return;

        if (result.tileGap) expect(result.tileGap, label).toBe("12px");
        if (result.tilePadding) expect(result.tilePadding, label).toBe("16px");
        expect(
          result.briefOverflow,
          `${label}: En bref width`
        ).toBeLessThanOrEqual(1);

        if (path.includes("/pays/") || path.endsWith("PPL_OVAMBO")) {
          expect(result.regimes.length, `${label}: stations`).toBeGreaterThan(
            0
          );
          expect(result.legend, `${label}: regime legend`).toBe(true);
        }
        for (const regime of result.regimes) {
          expect(["polity", "colonial", "modern"], label).toContain(regime);
        }

        if (path.includes("/pays/")) {
          expect(result.peoplesText, `${label}: peoples figures`).not.toMatch(
            /\d\.\dM|\d\+ peuples/
          );
        }

        if (width === 430) {
          expect(
            result.height,
            `${label}: height against the ${baseline.heights[path]} px baseline`
          ).toBeLessThanOrEqual(Math.round(baseline.heights[path] * 0.75));
        }
      });
    }
  }
});

test.describe("fiche parity — every country, sampled peoples", () => {
  test.skip(LOCALE !== "fr", "The sweep reads French routes.");
  test.describe.configure({ mode: "parallel" });

  for (const path of SWEEP) {
    // @req REQ-091
    test(`${path} keeps one width, ground, radius and gap`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: 430, height: 932 });
      await openRecord(page, path);
      expectSharedLayout(await measure(page), path, 430);
    });
  }
});
