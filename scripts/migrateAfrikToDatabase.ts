/**
 * Migration script: AFRIK files to Supabase database
 *
 * This script migrates all AFRIK data from TXT files to Supabase database.
 * It respects the order: language families → peoples → countries → relations
 */

// Load environment variables
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "@/lib/supabase/admin";
import { loadAllLanguageFamilies } from "@/lib/afrik/loaders/languageFamilyLoader";
import { loadAllPeoples } from "@/lib/afrik/loaders/peopleLoader";
import { loadAllCountries } from "@/lib/afrik/loaders/countryLoader";
import type { LanguageFamily, People, Country } from "@/types/afrik";

export interface MigrationReport {
  languageFamilies: {
    total: number;
    inserted: number;
    errors: string[];
  };
  peoples: {
    total: number;
    inserted: number;
    errors: string[];
  };
  countries: {
    total: number;
    inserted: number;
    errors: string[];
  };
  relations: {
    total: number;
    inserted: number;
    errors: string[];
  };
}

/**
 * Migrate all AFRIK data to database
 * @param dryRun If true, validates data without inserting
 */
export async function migrateAfrikToDatabase(
  dryRun: boolean = false
): Promise<MigrationReport> {
  const report: MigrationReport = {
    languageFamilies: { total: 0, inserted: 0, errors: [] },
    peoples: { total: 0, inserted: 0, errors: [] },
    countries: { total: 0, inserted: 0, errors: [] },
    relations: { total: 0, inserted: 0, errors: [] },
  };

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No data will be inserted");
  }

  const supabase = createAdminClient();

  try {
    // Step 1: Migrate Language Families
    console.log("📚 Loading language families...");
    const languageFamilies = await loadAllLanguageFamilies();
    report.languageFamilies.total = languageFamilies.length;
    console.log(`   Found ${languageFamilies.length} language families`);

    if (!dryRun) {
      for (const family of languageFamilies) {
        try {
          const { error } = await supabase
            .from("afrik_language_families")
            .upsert(
              {
                id: family.id,
                name_fr: family.nameFr,
                name_en: family.nameEn || null,
                content: family.content,
                created_at:
                  family.createdAt?.toISOString() || new Date().toISOString(),
                updated_at:
                  family.updatedAt?.toISOString() || new Date().toISOString(),
              },
              {
                onConflict: "id",
              }
            );

          if (error) {
            report.languageFamilies.errors.push(
              `${family.id}: ${error.message}`
            );
          } else {
            report.languageFamilies.inserted++;
          }
        } catch (err) {
          report.languageFamilies.errors.push(
            `${family.id}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }
      console.log(
        `   ✅ Inserted ${report.languageFamilies.inserted}/${report.languageFamilies.total} language families`
      );
    }

    // Step 2: Migrate Peoples
    console.log("👥 Loading peoples...");
    const peoples = await loadAllPeoples();
    report.peoples.total = peoples.length;
    console.log(`   Found ${peoples.length} peoples`);

    if (!dryRun) {
      for (const people of peoples) {
        try {
          const { error } = await supabase.from("afrik_peoples").upsert(
            {
              id: people.id,
              name_main: people.nameMain,
              language_family_id: people.languageFamilyId,
              content: people.content,
              created_at:
                people.createdAt?.toISOString() || new Date().toISOString(),
              updated_at:
                people.updatedAt?.toISOString() || new Date().toISOString(),
            },
            {
              onConflict: "id",
            }
          );

          if (error) {
            report.peoples.errors.push(`${people.id}: ${error.message}`);
          } else {
            report.peoples.inserted++;
          }
        } catch (err) {
          report.peoples.errors.push(
            `${people.id}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }
      console.log(
        `   ✅ Inserted ${report.peoples.inserted}/${report.peoples.total} peoples`
      );
    }

    // Step 3: Migrate Countries
    console.log("🌍 Loading countries...");
    const countries = await loadAllCountries();
    report.countries.total = countries.length;
    console.log(`   Found ${countries.length} countries`);

    if (!dryRun) {
      for (const country of countries) {
        try {
          const { error } = await supabase.from("afrik_countries").upsert(
            {
              id: country.id,
              name_fr: country.nameFr,
              etymology: country.etymology || null,
              name_origin_actor: country.nameOriginActor || null,
              content: country.content,
              created_at:
                country.createdAt?.toISOString() || new Date().toISOString(),
              updated_at:
                country.updatedAt?.toISOString() || new Date().toISOString(),
            },
            {
              onConflict: "id",
            }
          );

          if (error) {
            report.countries.errors.push(`${country.id}: ${error.message}`);
          } else {
            report.countries.inserted++;
          }
        } catch (err) {
          report.countries.errors.push(
            `${country.id}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }
      console.log(
        `   ✅ Inserted ${report.countries.inserted}/${report.countries.total} countries`
      );
    }

    // Step 4: Migrate Relations (People ↔ Country)
    console.log("🔗 Loading relations...");
    let relationCount = 0;

    if (!dryRun) {
      for (const people of peoples) {
        if (people.currentCountries && Array.isArray(people.currentCountries)) {
          for (const countryId of people.currentCountries) {
            if (countryId) {
              relationCount++;
              try {
                const { error } = await supabase
                  .from("afrik_people_countries")
                  .upsert(
                    {
                      people_id: people.id,
                      country_id: countryId,
                    },
                    {
                      onConflict: "people_id,country_id",
                    }
                  );

                if (error) {
                  report.relations.errors.push(
                    `${people.id} ↔ ${countryId}: ${error.message}`
                  );
                } else {
                  report.relations.inserted++;
                }
              } catch (err) {
                report.relations.errors.push(
                  `${people.id} ↔ ${countryId}: ${err instanceof Error ? err.message : "Unknown error"}`
                );
              }
            }
          }
        }
      }
      report.relations.total = relationCount;
      console.log(
        `   ✅ Inserted ${report.relations.inserted}/${report.relations.total} relations`
      );
    } else {
      // Count relations in dry-run mode
      for (const people of peoples) {
        if (people.currentCountries && Array.isArray(people.currentCountries)) {
          relationCount += people.currentCountries.filter((c) => c).length;
        }
      }
      report.relations.total = relationCount;
    }

    console.log("\n📊 Migration Summary:");
    console.log(
      `   Language Families: ${report.languageFamilies.inserted}/${report.languageFamilies.total}`
    );
    console.log(
      `   Peoples: ${report.peoples.inserted}/${report.peoples.total}`
    );
    console.log(
      `   Countries: ${report.countries.inserted}/${report.countries.total}`
    );
    console.log(
      `   Relations: ${report.relations.inserted}/${report.relations.total}`
    );

    if (
      report.languageFamilies.errors.length > 0 ||
      report.peoples.errors.length > 0 ||
      report.countries.errors.length > 0 ||
      report.relations.errors.length > 0
    ) {
      console.log("\n⚠️  Errors encountered:");
      if (report.languageFamilies.errors.length > 0) {
        console.log(
          `   Language Families: ${report.languageFamilies.errors.length} errors`
        );
      }
      if (report.peoples.errors.length > 0) {
        console.log(`   Peoples: ${report.peoples.errors.length} errors`);
      }
      if (report.countries.errors.length > 0) {
        console.log(`   Countries: ${report.countries.errors.length} errors`);
      }
      if (report.relations.errors.length > 0) {
        console.log(`   Relations: ${report.relations.errors.length} errors`);
      }
    }

    return report;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  migrateAfrikToDatabase(dryRun)
    .then((report) => {
      process.exit(
        report.languageFamilies.errors.length > 0 ||
          report.peoples.errors.length > 0 ||
          report.countries.errors.length > 0 ||
          report.relations.errors.length > 0
          ? 1
          : 0
      );
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
