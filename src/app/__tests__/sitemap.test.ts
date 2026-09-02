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
  getLanguageRoute,
  getLocalizedRoute,
  getPatronymeRoute,
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
  languages: ["bam", "wol"],
  patronymes: ["PAT_BAMBA_CLAN"],
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

  // Languages (748) and patronymes (30) have fiche routes but were absent
  // from the sitemap, leaving them unreachable by crawlers (ETNI-1800).
  // @req REQ-139
  // @req REQ-110
  it("carries one url per language and patronyme fiche", async () => {
    const all = await urls();
    const base = `https://${CANONICAL_DOMAIN}`;

    expect(all).toContain(`${base}${getLanguageRoute("fr", "bam")}`);
    expect(all).toContain(`${base}${getLanguageRoute("fr", "wol")}`);
    expect(all).toContain(
      `${base}${getPatronymeRoute("fr", "PAT_BAMBA_CLAN")}`
    );
  });

  // @req REQ-110
  it("lists the rubrics a reader enters by", async () => {
    const all = await urls();
    const base = `https://${CANONICAL_DOMAIN}`;

    for (const path of [
      "/fr",
      getLocalizedRoute("fr", "peoples"),
      getLocalizedRoute("fr", "countries"),
      getLocalizedRoute("fr", "families"),
      "/fr/plan-du-site",
    ]) {
      expect(all, path).toContain(`${base}${path}`);
    }
  });

  // Same treatment as the other corpus rubrics and the already-shipped
  // appellations index (ETNI-1453): the languages and patronymes hub routes
  // are reachable pages, so they are crawlable ones too (ETNI-1795).
  // @req REQ-139
  // @req REQ-110
  it("lists the languages and patronymes hub routes as rubrics", async () => {
    const all = await urls();
    const base = `https://${CANONICAL_DOMAIN}`;

    for (const path of [
      getLocalizedRoute("fr", "languages"),
      getLocalizedRoute("fr", "patronymes"),
    ]) {
      expect(all, path).toContain(`${base}${path}`);
    }
  });

  /**
   * The three axis landing pages are gone (ETNI-1555). Asserted on the exact
   * URL rather than as a fragment, because `/fr/atlas` is a prefix of the
   * three facet routes the sitemap must keep publishing.
   */
  // @req REQ-114
  it("publishes none of the retired axis landing pages", async () => {
    const all = await urls();
    const base = `https://${CANONICAL_DOMAIN}`;

    for (const page of ["atlasHub", "dossiersHub", "jeuxHub"] as const) {
      expect(all, page).not.toContain(
        `${base}${getLocalizedRoute("fr", page)}`
      );
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
      `${getLocalizedRoute("fr", "quiz")}/score`,
      "/fr/report-error",
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

  // @req REQ-139
  // @req REQ-110
  it("still ships the rubrics when the corpus cannot be read", async () => {
    mockedEntityIds.mockResolvedValue({
      peoples: [],
      countries: [],
      families: [],
      languages: [],
      patronymes: [],
    });

    const all = await urls();
    expect(all).toContain(`https://${CANONICAL_DOMAIN}/fr`);
    expect(all.some((url) => url.includes("/peuples/PPL_"))).toBe(false);
    expect(all.some((url) => url.includes("/atlas/langues/"))).toBe(false);
    expect(all.some((url) => url.includes("/atlas/noms/"))).toBe(false);
  });

  // @req REQ-110
  it("never emits the same url twice", async () => {
    const all = await urls();
    expect(new Set(all).size).toBe(all.length);
  });

  // @req REQ-110
  it("keeps UNLISTED_ROUTES documented alongside what it excludes", () => {
    expect(UNLISTED_ROUTES).toContain("admin");
    expect(UNLISTED_ROUTES).toContain("report-error");
    // The two duplicate privacy pages were retired rather than hidden, so
    // they are no longer anything's business to exclude.
    expect(UNLISTED_ROUTES).not.toContain("confidentialite");
    expect(UNLISTED_ROUTES).not.toContain("politique-confidentialite");
  });

  // The registry no longer listing them is one half; this is the other — what
  // the site actually emits. Hiding a second policy was never the same as not
  // having one, and it is the emitted set a reader can reach.
  // @req REQ-110
  it("serves exactly one privacy policy", async () => {
    const all = await urls();
    const policies = all.filter((url) =>
      /confidentialite|politique-de-donnees/.test(url)
    );

    expect(policies).toEqual([
      `https://${CANONICAL_DOMAIN}/fr/politique-de-donnees`,
    ]);
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

  // The duplicate privacy pages used to be listed here too. Deleting a route
  // is a stronger guarantee than asking a crawler not to index it, so the
  // disallow list shrank back to what authentication alone hides.
  // @req REQ-110
  it("bans the authenticated surfaces", () => {
    const rule = robots().rules;
    const disallow = Array.isArray(rule) ? rule[0].disallow : rule.disallow;

    expect(disallow).toContain("/fr/admin/");
    expect(disallow).not.toContain("/fr/politique-confidentialite");
    expect(disallow).not.toContain("/fr/confidentialite");
  });

  // Named routes are what a rewrite would drop; this holds the whole rule to
  // the property instead — nothing about a privacy policy is hidden here.
  // @req REQ-110
  it("no longer hides a privacy policy from crawlers", () => {
    const rule = robots().rules;
    const disallow = Array.isArray(rule) ? rule[0].disallow : rule.disallow;

    expect(
      (disallow as string[]).filter((path) => /confidentialite/.test(path))
    ).toEqual([]);
  });
});
