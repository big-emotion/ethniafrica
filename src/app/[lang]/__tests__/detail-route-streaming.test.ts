import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("detail route streaming", () => {
  // @req REQ-046
  it("does not delay every localized route behind a global loading boundary", () => {
    expect(
      existsSync(resolve(process.cwd(), "src/app/[lang]/loading.tsx"))
    ).toBe(false);
  });

  // @req REQ-046
  it("does not nest detail views in a second Suspense boundary", () => {
    const countryPage = readSource("src/app/[lang]/atlas/pays/[slug]/page.tsx");
    const peoplePage = readSource(
      "src/app/[lang]/atlas/peuples/[slug]/page.tsx"
    );

    expect(countryPage).not.toContain("<Suspense");
    expect(peoplePage).not.toContain("<Suspense");
  });

  // The country dossier used to be a client view that re-fetched a fiche the
  // route had already awaited. It is a server component now, so the guard is
  // no longer "keep the query parameters out of it" but "keep it off the
  // client altogether".
  // @req REQ-046
  it("keeps the country dossier off the client rendering path", () => {
    const countryView = readSource(
      "src/components/country/CountryRecordView.tsx"
    );

    expect(countryView).not.toContain('"use client"');
    expect(countryView).not.toContain("useSearchParams");
  });

  // The people dossier was a client view that fetched a fiche the route had
  // already awaited, and hid its heavier blocks behind tabs. It is a server
  // component now — the atlas fiche's parchment — so, as with the country
  // dossier, the guard is no longer "defer the chart past its tab" but "keep
  // the dossier off the client altogether".
  // @req REQ-046
  it("keeps the people dossier off the client rendering path", () => {
    const peopleView = readSource(
      "src/components/people/PeopleDetailViewV2.tsx"
    );

    expect(peopleView).not.toContain('"use client"');
    expect(peopleView).not.toContain("useSearchParams");
  });

  // The anon browser client this used to name is gone — the fiche views stopped
  // reading flags from the browser, and with them went the only caller of
  // `lib/supabase/client.ts`. Naming a deleted module would make this assertion
  // unfailable, so the guard widens to the invariant that outlived it: a fiche
  // view reaches Supabase through the route that already awaited it, never
  // through a client of its own. `auth-client` is deliberately not exempted —
  // a fiche has no business authenticating anyone.
  // @req REQ-046
  it("reaches Supabase through the route, never from a fiche view", () => {
    for (const relativePath of [
      "src/components/country/CountryRecordView.tsx",
      "src/components/people/PeopleDetailViewV2.tsx",
    ]) {
      expect(readSource(relativePath)).not.toContain("@/lib/supabase/");
    }
  });

  // @req REQ-046
  it("does not prefetch the heavier list route from detail breadcrumbs", () => {
    const breadcrumbs = readSource(
      "src/components/layout/AfrikBreadcrumbs.tsx"
    );

    expect(breadcrumbs).toContain("prefetch={false}");
  });
});
