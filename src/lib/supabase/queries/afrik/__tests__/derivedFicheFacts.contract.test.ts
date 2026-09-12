import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ProvenancedValue } from "@/lib/supabase/queries/afrik/derivedFicheFact";
import type { getCountryLanguagesFact } from "@/lib/supabase/queries/afrik/countryLanguageFamilies";
import type { derivePeopleCountryShares } from "@/lib/supabase/queries/afrik/peopleCountryShare";
import type { getLanguageDerivedFacts } from "@/lib/supabase/queries/afrik/languageDerivedFacts";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

describe("cross-record fiche derivation boundary", () => {
  // @req REQ-119
  it("keeps provenance inside each value", () => {
    expectTypeOf<ProvenancedValue<string>>().toExtend<{
      value: string | null;
      provenance: "declared" | "derived" | "missing";
      from?: string[];
    }>();
    expectTypeOf<
      Awaited<ReturnType<typeof getCountryLanguagesFact>>
    >().toEqualTypeOf<ProvenancedValue<string[]>>();
    expectTypeOf<
      ReturnType<typeof derivePeopleCountryShares>["shares"][number]["share"]
    >().toEqualTypeOf<ProvenancedValue<number>>();
    expectTypeOf<
      Awaited<ReturnType<typeof getLanguageDerivedFacts>>["dialects"]
    >().toEqualTypeOf<ProvenancedValue<string[]>>();
  });

  // @req REQ-119
  it("keeps fiche pages and transformers from reading corpus joins directly", () => {
    const files = [
      resolve(process.cwd(), "src/lib/countryDataTransformer.ts"),
      resolve(process.cwd(), "src/lib/peopleDataTransformer.ts"),
      ...sourceFiles(resolve(process.cwd(), "src/app/[lang]/atlas")),
      ...sourceFiles(resolve(process.cwd(), "src/components/fiche")),
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(
        /\.from\(["'`]afrik_people_countries["'`]\)/
      );
      expect(source, file).not.toMatch(
        /\.from\(["'`]afrik_people_languages["'`]\)/
      );
    }
  });
});
