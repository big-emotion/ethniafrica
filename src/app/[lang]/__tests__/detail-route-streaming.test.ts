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
    const countryPage = readSource("src/app/[lang]/pays/[slug]/page.tsx");
    const peoplePage = readSource("src/app/[lang]/peuples/[slug]/page.tsx");

    expect(countryPage).not.toContain("<Suspense");
    expect(peoplePage).not.toContain("<Suspense");
  });

  // @req REQ-046
  it("keeps country query parameters out of the client rendering path", () => {
    const countryView = readSource(
      "src/components/detail/CountryDetailViewV2.tsx"
    );

    expect(countryView).not.toContain("useSearchParams");
  });

  // @req REQ-046
  it("does not load the demographics chart before its tab is opened", () => {
    const peopleView = readSource("src/components/detail/PeopleDetailView.tsx");

    expect(peopleView).not.toContain(
      'import { DemographicsChart } from "@/components/charts/DemographicsChart"'
    );
    expect(peopleView).toContain("lazy(() =>");
  });

  // @req REQ-046
  it("does not load the Supabase browser client for server-rendered flags", () => {
    for (const relativePath of [
      "src/components/detail/CountryDetailViewV2.tsx",
      "src/components/detail/PeopleDetailView.tsx",
    ]) {
      const source = readSource(relativePath);
      expect(source).not.toContain(
        'import { hasActiveSourceFlag } from "@/lib/flags-client"'
      );
      expect(source).not.toContain('import("@/lib/flags-client")');
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
