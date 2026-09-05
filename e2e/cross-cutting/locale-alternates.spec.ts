import { expect, test, type Page } from "@playwright/test";

import { CANONICAL_DOMAIN } from "@/lib/brand";
import { LOCALES } from "@/lib/locale";
import { getPeopleRoute } from "@/lib/routing";
import { OG_LOCALE_BY_LANGUAGE } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

/**
 * The crawler-facing head, read from the served document (REQ-141).
 *
 * The unit charter renders each page's `generateMetadata`; nothing there
 * proves Next put the result in the `<head>` the crawler reads, and nothing
 * proves the root layout stamped `<html lang>` from the middleware header.
 * This spec reads both from a running app. Not run in CI — Playwright never
 * is here — so it stays small: the two homes and one fiche in each locale.
 */

const BASE = `https://${CANONICAL_DOMAIN}`;

async function hreflangCluster(page: Page): Promise<Record<string, string>> {
  const links = await page
    .locator("link[rel=alternate][hreflang]")
    .evaluateAll((elements) =>
      elements.map((element) => [
        element.getAttribute("hreflang"),
        element.getAttribute("href"),
      ])
    );
  return Object.fromEntries(links);
}

for (const locale of LOCALES) {
  // @req REQ-141
  test(`the ${locale} home declares its locale in the document and its head`, async ({
    page,
  }) => {
    await page.goto(`/${locale}`);

    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      `${BASE}/${locale}`
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      OG_LOCALE_BY_LANGUAGE[locale]
    );
  });
}

// The home is not at parity yet: French alone in the cluster, no x-default.
// @req REQ-141
test("the French home clusters only the indexed locales", async ({ page }) => {
  await page.goto("/fr");

  const cluster = await hreflangCluster(page);
  expect(cluster.fr).toBe(`${BASE}/fr`);
  expect(cluster).not.toHaveProperty("x-default");
});

const YORUBA: Record<Language, string> = {
  en: getPeopleRoute("en", "PPL_YORUBA"),
  fr: getPeopleRoute("fr", "PPL_YORUBA"),
};

// @req REQ-141
test("the French fiche is indexed, canonical on itself", async ({ page }) => {
  await page.goto(YORUBA.fr);

  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    `${BASE}${YORUBA.fr}`
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

// No translation record exists for the fiche yet, so its English address is
// served but withheld from the index, and absent from the French cluster.
// @req REQ-141
test("the English fiche is served, canonical on itself, and noindex", async ({
  page,
}) => {
  await page.goto(YORUBA.en);

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    `${BASE}${YORUBA.en}`
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/
  );
  const cluster = await hreflangCluster(page);
  expect(cluster).not.toHaveProperty("en");
});
