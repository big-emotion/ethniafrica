import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import { LOCALE } from "./support/locale";

const spacing = readFileSync(
  join(process.cwd(), "src/styles/tokens/space.css"),
  "utf8"
);
const parchment = readFileSync(
  join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

const chapter = (name: string) =>
  `<section class="afh-parchment-section" data-fiche-section="${name}"><h2>${name}</h2><p>Chapter content.</p></section>`;

const peopleCustomChapter = (name: string) =>
  `<section class="people-fade-in" data-fiche-section="${name}" style="padding:18px"><h2>${name}</h2><p>Chapter content.</p></section>`;

const familyChapter = (name: string) =>
  `<div class="afh-parchment-section"><section data-fiche-section="${name}"><h2>${name}</h2><p>Chapter content.</p></section></div>`;

const fixtures = [
  ["country", `${chapter("One")}${chapter("Two")}${chapter("Three")}`],
  [
    "people",
    `${chapter("One")}${peopleCustomChapter("Two")}${chapter("Three")}`,
  ],
  ["name", `${chapter("One")}${chapter("Two")}${chapter("Three")}`],
  ["language", `${chapter("One")}${chapter("Two")}${chapter("Three")}`],
  [
    "family",
    `${chapter("One")}${chapter("Two")}${familyChapter("Three")}${familyChapter("Four")}`,
  ],
] as const;

for (const [kind, markup] of fixtures) {
  // @req REQ-152
  test(`${kind} fiche chapters follow the rendered token at every breakpoint`, async ({
    page,
  }) => {
    await page.setContent(
      `<meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0} ${spacing}\n${parchment}</style><main lang="${LOCALE}" class="afh-parchment">${markup}</main>`
    );

    for (const [width, expectedToken] of [
      [430, 24],
      [768, 32],
      [1200, 48],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      const result = await page
        .locator("[data-fiche-section]")
        .evaluateAll((nodes) => {
          const token = Number.parseFloat(
            getComputedStyle(document.documentElement)
              .getPropertyValue("--afh-section-gap")
              .trim()
          );
          const gaps = nodes.slice(1).map((node, index) => {
            const previous = nodes[index].getBoundingClientRect();
            const current = node.getBoundingClientRect();
            return Math.round(current.top - previous.bottom);
          });
          const padding = getComputedStyle(nodes[0]).padding;
          return { token, gaps, padding };
        });

      expect(result.token, `${kind} token at ${width}px`).toBe(expectedToken);
      expect(result.gaps.length, `${kind} at ${width}px`).toBeGreaterThan(0);
      expect(
        [...new Set(result.gaps)],
        `${kind} at ${width}px: ${result.gaps.join(", ")}`
      ).toEqual([result.token]);
      expect(result.padding).toBe(width < 768 ? "26px 20px" : "34px 40px");
    }
  });
}
