import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/queries/afrik/sitemapEntries", () => ({
  getSitemapEntityIds: vi.fn(),
}));

import robots from "../robots";
import sitemap from "../sitemap";
import { CANONICAL_DOMAIN } from "@/lib/brand";
import { UNLISTED_ROUTES } from "@/lib/siteTree";
import { getSitemapEntityIds } from "@/lib/supabase/queries/afrik/sitemapEntries";
import {
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
} from "@/lib/routing";

const mockedEntityIds = getSitemapEntityIds as unknown as ReturnType<
  typeof vi.fn
>;

const CORPUS = {
  peoples: ["PPL_BAMILEKE", "PPL_WOLOF"],
  countries: ["CMR", "SEN"],
  families: ["FLG_NIGER_CONGO"],
};

async function urls() {
  const entries = await sitemap();
  return entries.map((entry) => entry.url);
}

describe("sitemap.xml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedEntityIds.mockResolvedValue(CORPUS);
  });

  // The root layout's metadataBase falls back to localhost:3000. Publishing
  // 890 localhost URLs is the failure this pins.
  // @req REQ-110
  it("addresses every url at the canonical domain", async () => {
    const all = await urls();
    expect(all.length).toBeGreaterThan(0);
    for (const url of all) {
      expect(url.startsWith(`https://${CANONICAL_DOMAIN}/`)).toBe(true);
    }
  });

  // @req REQ-110
  it("carries one url per fiche, plus the peoples' liens sub-route", async () => {
    const all = await urls();
    const base = `https://${CANONICAL_DOMAIN}`;

    expect(all).toContain(`${base}${getFamilyRoute("fr", "FLG_NIGER_CONGO")}`);
    expect(all).toContain(`${base}${getPeopleRoute("fr", "PPL_WOLOF")}`);
    expect(all).toContain(`${base}${getPeopleLinksRoute("fr", "PPL_WOLOF")}`);
    expect(all).toContain(`${base}${getCountryRoute("fr", "CMR")}`);
  });

  // @req REQ-110
  it("lists the rubrics a reader enters by", async () => {
    const all = await urls();
    const base = `https://${CANONICAL_DOMAIN}`;

    for (const path of [
      "/fr",
      getLocalizedRoute("fr", "explorerHub"),
      getLocalizedRoute("fr", "comprendreHub"),
      getLocalizedRoute("fr", "jouerHub"),
      getLocalizedRoute("fr", "peoples"),
      getLocalizedRoute("fr", "countries"),
      getLocalizedRoute("fr", "families"),
      "/fr/plan-du-site",
    ]) {
      expect(all, path).toContain(`${base}${path}`);
    }
  });

  // @req REQ-110
  it("omits the authenticated, terminal and combinatorial routes", async () => {
    const all = await urls();
    const paths = all.map((url) =>
      url.replace(`https://${CANONICAL_DOMAIN}`, "")
    );

    for (const fragment of [
      "/fr/admin",
      "/fr/compte",
      `${getLocalizedRoute("fr", "quiz")}/score`,
      "/fr/report-error",
      "/fr/confidentialite",
      "/fr/politique-confidentialite",
    ]) {
      expect(
        paths.filter((path) => path.startsWith(fragment)),
        fragment
      ).toEqual([]);
    }

    // /comparer is in; the pairs it can build are not.
    expect(paths).toContain("/fr/comparer");
    expect(paths.filter((path) => path.startsWith("/fr/comparer/"))).toEqual(
      []
    );
  });

  // Languages are reachable only nested under a family; they have no route of
  // their own, so there is nothing to list.
  // @req REQ-110
  it("lists no standalone language route", async () => {
    const all = await urls();
    expect(all.filter((url) => url.includes("/langues"))).toEqual([]);
  });

  // @req REQ-110
  it("still ships the rubrics when the corpus cannot be read", async () => {
    mockedEntityIds.mockResolvedValue({
      peoples: [],
      countries: [],
      families: [],
    });

    const all = await urls();
    expect(all).toContain(`https://${CANONICAL_DOMAIN}/fr`);
    expect(all.some((url) => url.includes("/peuples/PPL_"))).toBe(false);
  });

  // @req REQ-110
  it("never emits the same url twice", async () => {
    const all = await urls();
    expect(new Set(all).size).toBe(all.length);
  });

  // @req REQ-110
  it("keeps UNLISTED_ROUTES documented alongside what it excludes", () => {
    expect(UNLISTED_ROUTES).toContain("admin");
    expect(UNLISTED_ROUTES).toContain("politique-confidentialite");
  });
});

describe("robots.txt", () => {
  // public/robots.txt carried no Sitemap line, and a hard-coded one would have
  // been the first thing to go stale on a domain change.
  // @req REQ-110
  it("points crawlers at the sitemap on the canonical domain", () => {
    const rules = robots();
    expect(rules.sitemap).toBe(`https://${CANONICAL_DOMAIN}/sitemap.xml`);
    expect(rules.host).toBe(`https://${CANONICAL_DOMAIN}`);
  });

  // @req REQ-110
  it("bans the authenticated surfaces and the duplicate privacy pages", () => {
    const rule = robots().rules;
    const disallow = Array.isArray(rule) ? rule[0].disallow : rule.disallow;

    expect(disallow).toContain("/fr/admin/");
    expect(disallow).toContain("/fr/compte/");
    expect(disallow).toContain("/fr/politique-confidentialite");
  });
});
