/**
 * Script de migration des données enrichies depuis les fichiers parsés vers Supabase
 *
 * Usage: tsx scripts/migrateEnrichedData.ts
 */

// Load environment variables from .env.local
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import * as fs from "fs";
import { createAdminClient } from "../src/lib/supabase/admin";
import { normalizeToKey } from "../src/lib/normalize";
import {
  getRegionKey,
  getCountryKey,
  getEthnicityKey,
} from "../src/lib/entityKeys";

interface AncientNameEntry {
  period: string;
  names: string[];
}

interface MatchedCountryData {
  countryName: string;
  region: string;
  countryDescription: {
    ancientNames: AncientNameEntry[];
    description: string;
  } | null;
  ethnicities: MatchedEthnicity[];
}

interface MatchedEthnicity {
  groupName: string;
  subGroups: SubgroupInfo[];
  population: number;
  percentageInCountry: number;
  percentageInAfrica: number;
  languages: string[];
  region: string;
  sources: string[];
  ancientName: string;
  description: string;
  societyType: string;
  religion: string;
  linguisticFamily: string;
  historicalStatus: string;
  regionalPresence: string[];
  isGroupWithSubgroups: boolean;
  matchedDescription?: {
    ancientName: string[];
    description: string;
  };
}

interface SubgroupInfo {
  name: string;
  population: number;
  percentageInCountry: number;
  percentageInAfrica: number;
}

// Convertir les anciennes appellations en JSON pour stockage
function formatAncientNamesForDB(
  ancientNames: AncientNameEntry[] | string[] | string | null | undefined
): string | null {
  // Si c'est déjà le nouveau format (tableau d'objets)
  if (Array.isArray(ancientNames) && ancientNames.length > 0) {
    // Vérifier si c'est le nouveau format (objets avec period et names)
    if (
      typeof ancientNames[0] === "object" &&
      "period" in ancientNames[0] &&
      "names" in ancientNames[0]
    ) {
      // Nouveau format: convertir toutes les entrées en JSON (sans limite)
      // La limite à 3 sera appliquée uniquement pour l'affichage dans la vue détaillée
      return JSON.stringify(ancientNames as AncientNameEntry[]);
    }
    // Ancien format: tableau de strings
    else if (typeof ancientNames[0] === "string") {
      // Convertir en nouveau format avec période vide
      const converted: AncientNameEntry[] = (ancientNames as string[])
        .slice(0, 3)
        .map((name) => ({ period: "", names: [name] }));
      return JSON.stringify(converted);
    }
  }
  // Si c'est une string (ancien format séparé par virgules)
  else if (typeof ancientNames === "string" && ancientNames.trim()) {
    const namesArray = ancientNames
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    const converted: AncientNameEntry[] = namesArray
      .slice(0, 3)
      .map((name) => ({ period: "", names: [name] }));
    return JSON.stringify(converted);
  }

  return null;
}

// Fonction de compatibilité pour les ethnies (ancien format)
function limitAncientNames(names: string | string[]): string {
  const namesArray = Array.isArray(names)
    ? names
    : typeof names === "string" && names.trim()
      ? names
          .split(",")
          .map((n) => n.trim())
          .filter((n) => n.length > 0)
      : [];
  return namesArray.slice(0, 3).join(", ");
}

/**
 * Formate une erreur pour l'affichage
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    // Erreur Supabase avec propriétés supplémentaires
    const supabaseError = error as Error & {
      code?: string;
      details?: string;
      hint?: string;
      message?: string;
    };

    let message = supabaseError.message || error.message;

    if (supabaseError.code) {
      message += ` (code: ${supabaseError.code})`;
    }

    if (supabaseError.details) {
      message += ` - ${supabaseError.details}`;
    }

    if (supabaseError.hint) {
      message += ` (hint: ${supabaseError.hint})`;
    }

    return message;
  }

  // Si c'est un objet, essayer de le sérialiser
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

// Invalider le cache Next.js après la migration
async function invalidateCache() {
  const revalidateSecret = process.env.REVALIDATE_SECRET;
  const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!revalidateSecret) {
    console.warn(
      "\n⚠️  REVALIDATE_SECRET not set. Cache will not be invalidated automatically."
    );
    console.warn(
      "   Add REVALIDATE_SECRET to .env.local to enable automatic cache invalidation."
    );
    return;
  }

  console.log("\n🔄 Invalidating Next.js cache...");

  try {
    const response = await fetch(`${apiUrl}/api/admin/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${revalidateSecret}`,
      },
      body: JSON.stringify({
        tags: ["regions", "countries", "ethnicities", "population", "africa"],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log("✅ Cache invalidated successfully!");
    console.log(`   Invalidated tags: ${result.invalidatedTags.join(", ")}`);
  } catch (error) {
    console.error("⚠️  Failed to invalidate cache:", error);
    console.error(
      "   You may need to manually invalidate the cache or restart the server."
    );
    console.error(
      "   Make sure the Next.js server is running and REVALIDATE_SECRET is correct."
    );
  }
}

async function main() {
  console.log("🚀 Starting enriched data migration to Supabase...\n");

  // Initialize Supabase admin client
  const supabase = createAdminClient();

  // Load matched data
  const matchedDir = path.join(process.cwd(), "dataset", "matched");
  const matchedFiles = fs
    .readdirSync(matchedDir)
    .filter((f) => f.endsWith("_matched.json") && !f.includes("all_"));

  if (matchedFiles.length === 0) {
    throw new Error(
      `No matched data files found in ${matchedDir}. Please run parseEnrichedCountryCSV.ts, parseCountryDescriptions.ts, and matchCSVAndDescriptions.ts first.`
    );
  }

  const stats = {
    regions: 0,
    countries: 0,
    ethnicities: 0,
    subgroups: 0,
    presences: 0,
    languages: 0,
    sources: 0,
    errors: 0,
  };

  // Maps to store IDs for relationships
  const regionIdMap = new Map<string, string>(); // regionKey -> UUID
  const countryIdMap = new Map<string, string>(); // countrySlug -> UUID
  const ethnicityIdMap = new Map<string, string>(); // ethnicitySlug -> UUID
  const languageIdMap = new Map<string, string>(); // languageName -> UUID
  const sourceIdMap = new Map<string, string>(); // sourceTitle -> UUID

  // Map pour calculer les populations totales par région
  const regionPopulations = new Map<string, number>();

  try {
    // Step 1: Create/update regions
    console.log("📦 Step 1: Creating/updating regions...");
    const regionSet = new Set<string>();
    for (const file of matchedFiles) {
      const matchedData: MatchedCountryData = JSON.parse(
        fs.readFileSync(path.join(matchedDir, file), "utf-8")
      );
      regionSet.add(matchedData.region);
    }

    for (const regionKey of regionSet) {
      try {
        const regionName =
          regionKey === "afrique_du_nord"
            ? "Afrique du Nord"
            : regionKey === "afrique_de_l_ouest"
              ? "Afrique de l'Ouest"
              : regionKey === "afrique_centrale"
                ? "Afrique Centrale"
                : regionKey === "afrique_de_l_est"
                  ? "Afrique de l'Est"
                  : regionKey === "afrique_australe"
                    ? "Afrique Australe"
                    : regionKey;

        // Calculer la population totale de la région
        // On va d'abord calculer toutes les populations de pays, puis les sommer
        const countryPopulations: number[] = [];
        for (const file of matchedFiles) {
          const matchedData: MatchedCountryData = JSON.parse(
            fs.readFileSync(path.join(matchedDir, file), "utf-8")
          );
          if (matchedData.region === regionKey) {
            // Calculer la population du pays depuis les ethnies
            // On utilise la population de l'ethnie avec le plus grand pourcentage
            // pour estimer la population totale du pays
            const countryPopulation = matchedData.ethnicities.reduce(
              (max, eth) => {
                if (eth.percentageInCountry > 0) {
                  const estimated = Math.round(
                    (eth.population / eth.percentageInCountry) * 100
                  );
                  return Math.max(max, estimated);
                }
                return max;
              },
              0
            );
            if (countryPopulation > 0) {
              countryPopulations.push(countryPopulation);
            }
          }
        }
        // Sommer toutes les populations de pays pour obtenir la population totale de la région
        const totalPopulation = countryPopulations.reduce(
          (sum, pop) => sum + pop,
          0
        );
        regionPopulations.set(regionKey, totalPopulation);

        const { data, error } = await supabase
          .from("african_regions")
          .upsert(
            {
              code: regionKey,
              name_fr: regionName,
              total_population: totalPopulation,
            },
            {
              onConflict: "code",
            }
          )
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505") {
            // Already exists, fetch it
            const { data: existing } = await supabase
              .from("african_regions")
              .select("id")
              .eq("code", regionKey)
              .single();
            if (existing) {
              regionIdMap.set(regionKey, existing.id);
              console.log(`  ✓ Region "${regionName}" already exists`);
              stats.regions++;
            }
          } else {
            throw error;
          }
        } else if (data) {
          regionIdMap.set(regionKey, data.id);
          console.log(
            `  ✓ Created/updated region "${regionName}" (${regionKey})`
          );
          stats.regions++;
        }
      } catch (error: unknown) {
        const message = formatError(error);
        console.error(`  ✗ Error with region "${regionKey}":`, message);
        stats.errors++;
      }
    }

    // Step 2: Create/update countries
    console.log("\n📦 Step 2: Creating/updating countries...");
    for (const file of matchedFiles) {
      const matchedData: MatchedCountryData = JSON.parse(
        fs.readFileSync(path.join(matchedDir, file), "utf-8")
      );

      const regionId = regionIdMap.get(matchedData.region);
      if (!regionId) {
        console.error(
          `  ✗ Region ID not found for ${matchedData.region}, skipping country ${matchedData.countryName}`
        );
        continue;
      }

      try {
        const countrySlug =
          getCountryKey(matchedData.countryName) ||
          normalizeToKey(matchedData.countryName);

        // Calculer la population du pays
        const countryPopulation = matchedData.ethnicities.reduce((sum, eth) => {
          if (eth.percentageInCountry > 0) {
            return Math.max(
              sum,
              Math.round((eth.population / eth.percentageInCountry) * 100)
            );
          }
          return sum;
        }, 0);

        const regionTotalPopulation =
          regionPopulations.get(matchedData.region) || 1;
        const percentageInRegion =
          (countryPopulation / regionTotalPopulation) * 100;

        // Calculer percentage_in_africa (approximation)
        const totalAfricaPopulation = Array.from(
          regionPopulations.values()
        ).reduce((sum, pop) => sum + pop, 0);
        const percentageInAfrica =
          (countryPopulation / totalAfricaPopulation) * 100;

        // Anciens noms du pays (nouveau format JSON)
        const ancientNames = matchedData.countryDescription?.ancientNames || [];
        const ancientNamesJson = formatAncientNamesForDB(ancientNames);

        const { data, error } = await supabase
          .from("countries")
          .upsert(
            {
              slug: countrySlug,
              name_fr: matchedData.countryName,
              region_id: regionId,
              population_2025: countryPopulation,
              percentage_in_region: percentageInRegion,
              percentage_in_africa: percentageInAfrica,
              description: matchedData.countryDescription?.description || null,
              ancient_names: ancientNamesJson,
            },
            {
              onConflict: "slug",
            }
          )
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505") {
            const { data: existing } = await supabase
              .from("countries")
              .select("id")
              .eq("slug", countrySlug)
              .single();
            if (existing) {
              countryIdMap.set(countrySlug, existing.id);
              console.log(
                `  ✓ Country "${matchedData.countryName}" already exists`
              );
              stats.countries++;
            }
          } else {
            throw error;
          }
        } else if (data) {
          countryIdMap.set(countrySlug, data.id);
          console.log(
            `  ✓ Created/updated country "${matchedData.countryName}" (${countrySlug})`
          );
          stats.countries++;
        }
      } catch (error: unknown) {
        const message = formatError(error);
        console.error(
          `  ✗ Error creating country "${matchedData.countryName}":`,
          message
        );
        stats.errors++;
      }
    }

    // Step 3: Create/update languages
    console.log("\n📦 Step 3: Creating/updating languages...");
    const allLanguages = new Set<string>();
    for (const file of matchedFiles) {
      const matchedData: MatchedCountryData = JSON.parse(
        fs.readFileSync(path.join(matchedDir, file), "utf-8")
      );
      for (const ethnicity of matchedData.ethnicities) {
        ethnicity.languages.forEach((lang) => allLanguages.add(lang));
        ethnicity.subGroups.forEach((sub) => {
          // Les sous-groupes peuvent avoir leurs propres langues si spécifiées
        });
      }
    }

    for (const languageName of allLanguages) {
      try {
        const languageCode = normalizeToKey(languageName).substring(0, 10);

        const { data, error } = await supabase
          .from("languages")
          .upsert(
            {
              code: languageCode,
              name_fr: languageName,
            },
            {
              onConflict: "code",
            }
          )
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505") {
            const { data: existing } = await supabase
              .from("languages")
              .select("id")
              .eq("code", languageCode)
              .single();
            if (existing) {
              languageIdMap.set(languageName, existing.id);
            }
          } else {
            throw error;
          }
        } else if (data) {
          languageIdMap.set(languageName, data.id);
          stats.languages++;
        }
      } catch (error: unknown) {
        const message = formatError(error);
        console.error(
          `  ✗ Error creating language "${languageName}":`,
          message
        );
        stats.errors++;
      }
    }
    console.log(`  ✓ ${languageIdMap.size} languages processed`);

    // Step 4: Create/update sources
    console.log("\n📦 Step 4: Creating/updating sources...");
    const allSources = new Set<string>();
    for (const file of matchedFiles) {
      const matchedData: MatchedCountryData = JSON.parse(
        fs.readFileSync(path.join(matchedDir, file), "utf-8")
      );
      for (const ethnicity of matchedData.ethnicities) {
        ethnicity.sources.forEach((source) => allSources.add(source));
      }
    }

    for (const sourceTitle of allSources) {
      try {
        // Vérifier d'abord si la source existe déjà
        const { data: existing } = await supabase
          .from("sources")
          .select("id")
          .eq("title", sourceTitle)
          .maybeSingle();

        if (existing) {
          sourceIdMap.set(sourceTitle, existing.id);
          continue;
        }

        // Créer la source si elle n'existe pas
        const { data, error } = await supabase
          .from("sources")
          .insert({
            title: sourceTitle,
          })
          .select("id")
          .single();

        if (error) {
          // Si erreur de doublon, réessayer de récupérer
          if (error.code === "23505") {
            const { data: existingAfterError } = await supabase
              .from("sources")
              .select("id")
              .eq("title", sourceTitle)
              .single();
            if (existingAfterError) {
              sourceIdMap.set(sourceTitle, existingAfterError.id);
            }
          } else {
            throw error;
          }
        } else if (data) {
          sourceIdMap.set(sourceTitle, data.id);
          stats.sources++;
        }
      } catch (error: unknown) {
        const message = formatError(error);
        console.error(`  ✗ Error creating source "${sourceTitle}":`, message);
        stats.errors++;
      }
    }
    console.log(`  ✓ ${sourceIdMap.size} sources processed`);

    // Step 5: Create ethnic groups (parents first, then subgroups)
    console.log("\n📦 Step 5: Creating/updating ethnic groups...");

    // First pass: create parent groups
    for (const file of matchedFiles) {
      const matchedData: MatchedCountryData = JSON.parse(
        fs.readFileSync(path.join(matchedDir, file), "utf-8")
      );

      for (const ethnicity of matchedData.ethnicities) {
        if (ethnicity.isGroupWithSubgroups) {
          // C'est un groupe parent, le créer
          try {
            const ethnicitySlug =
              getEthnicityKey(ethnicity.groupName) ||
              normalizeToKey(ethnicity.groupName);

            // Éviter les doublons
            if (ethnicityIdMap.has(ethnicitySlug)) continue;

            // Calculer la population totale (somme des sous-groupes)
            const totalPopulation = ethnicity.subGroups.reduce(
              (sum, sub) => sum + sub.population,
              ethnicity.population
            );

            // Ancien nom
            const ancientNameStr = limitAncientNames(
              ethnicity.matchedDescription?.ancientName ||
                (ethnicity.ancientName ? [ethnicity.ancientName] : [])
            );

            // Description (priorité à la description matched)
            const description =
              ethnicity.matchedDescription?.description ||
              ethnicity.description ||
              null;

            const { data, error } = await supabase
              .from("ethnic_groups")
              .upsert(
                {
                  slug: ethnicitySlug,
                  name_fr: ethnicity.groupName,
                  total_population: totalPopulation,
                  percentage_in_africa: ethnicity.percentageInAfrica,
                  description: description,
                  ancient_name: ancientNameStr || null,
                  society_type: ethnicity.societyType || null,
                  religion: ethnicity.religion || null,
                  linguistic_family: ethnicity.linguisticFamily || null,
                  historical_status: ethnicity.historicalStatus || null,
                  regional_presence:
                    ethnicity.regionalPresence.join(", ") || null,
                },
                {
                  onConflict: "slug",
                }
              )
              .select("id")
              .single();

            if (error) {
              if (error.code === "23505") {
                const { data: existing } = await supabase
                  .from("ethnic_groups")
                  .select("id")
                  .eq("slug", ethnicitySlug)
                  .single();
                if (existing) {
                  ethnicityIdMap.set(ethnicitySlug, existing.id);
                }
              } else {
                throw error;
              }
            } else if (data) {
              ethnicityIdMap.set(ethnicitySlug, data.id);
              stats.ethnicities++;
            }
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            console.error(
              `  ✗ Error creating ethnicity "${ethnicity.groupName}":`,
              message
            );
            stats.errors++;
          }
        }
      }
    }

    // Second pass: create subgroups and standalone ethnicities
    for (const file of matchedFiles) {
      const matchedData: MatchedCountryData = JSON.parse(
        fs.readFileSync(path.join(matchedDir, file), "utf-8")
      );

      for (const ethnicity of matchedData.ethnicities) {
        if (ethnicity.isGroupWithSubgroups) {
          // Créer les sous-groupes
          const parentSlug =
            getEthnicityKey(ethnicity.groupName) ||
            normalizeToKey(ethnicity.groupName);
          const parentId = ethnicityIdMap.get(parentSlug);

          if (!parentId) {
            console.error(
              `  ✗ Parent ID not found for "${ethnicity.groupName}", skipping subgroups`
            );
            continue;
          }

          for (const subgroup of ethnicity.subGroups) {
            try {
              const subgroupSlug =
                getEthnicityKey(subgroup.name) || normalizeToKey(subgroup.name);

              // Éviter les doublons
              if (ethnicityIdMap.has(subgroupSlug)) continue;

              const { data, error } = await supabase
                .from("ethnic_groups")
                .upsert(
                  {
                    slug: subgroupSlug,
                    name_fr: subgroup.name,
                    parent_id: parentId,
                    total_population: subgroup.population,
                    percentage_in_africa: subgroup.percentageInAfrica,
                  },
                  {
                    onConflict: "slug",
                  }
                )
                .select("id")
                .single();

              if (error) {
                if (error.code === "23505") {
                  const { data: existing } = await supabase
                    .from("ethnic_groups")
                    .select("id")
                    .eq("slug", subgroupSlug)
                    .single();
                  if (existing) {
                    ethnicityIdMap.set(subgroupSlug, existing.id);
                  }
                } else {
                  throw error;
                }
              } else if (data) {
                ethnicityIdMap.set(subgroupSlug, data.id);
                stats.subgroups++;
              }
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              console.error(
                `  ✗ Error creating subgroup "${subgroup.name}":`,
                message
              );
              stats.errors++;
            }
          }
        } else {
          // C'est une ethnie standalone (pas de sous-groupes)
          try {
            const ethnicitySlug =
              getEthnicityKey(ethnicity.groupName) ||
              normalizeToKey(ethnicity.groupName);

            // Éviter les doublons
            if (ethnicityIdMap.has(ethnicitySlug)) continue;

            const ancientNameStr = limitAncientNames(
              ethnicity.matchedDescription?.ancientName ||
                (ethnicity.ancientName ? [ethnicity.ancientName] : [])
            );

            const description =
              ethnicity.matchedDescription?.description ||
              ethnicity.description ||
              null;

            const { data, error } = await supabase
              .from("ethnic_groups")
              .upsert(
                {
                  slug: ethnicitySlug,
                  name_fr: ethnicity.groupName,
                  total_population: ethnicity.population,
                  percentage_in_africa: ethnicity.percentageInAfrica,
                  description: description,
                  ancient_name: ancientNameStr || null,
                  society_type: ethnicity.societyType || null,
                  religion: ethnicity.religion || null,
                  linguistic_family: ethnicity.linguisticFamily || null,
                  historical_status: ethnicity.historicalStatus || null,
                  regional_presence:
                    ethnicity.regionalPresence.join(", ") || null,
                },
                {
                  onConflict: "slug",
                }
              )
              .select("id")
              .single();

            if (error) {
              if (error.code === "23505") {
                const { data: existing } = await supabase
                  .from("ethnic_groups")
                  .select("id")
                  .eq("slug", ethnicitySlug)
                  .single();
                if (existing) {
                  ethnicityIdMap.set(ethnicitySlug, existing.id);
                }
              } else {
                throw error;
              }
            } else if (data) {
              ethnicityIdMap.set(ethnicitySlug, data.id);
              stats.ethnicities++;
            }
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            console.error(
              `  ✗ Error creating ethnicity "${ethnicity.groupName}":`,
              message
            );
            stats.errors++;
          }
        }
      }
    }

    // Step 6: Create presences and relationships
    console.log("\n📦 Step 6: Creating presences and relationships...");
    for (const file of matchedFiles) {
      const matchedData: MatchedCountryData = JSON.parse(
        fs.readFileSync(path.join(matchedDir, file), "utf-8")
      );

      const countrySlug =
        getCountryKey(matchedData.countryName) ||
        normalizeToKey(matchedData.countryName);
      const countryId = countryIdMap.get(countrySlug);

      if (!countryId) {
        console.error(
          `  ✗ Country ID not found for ${matchedData.countryName}, skipping presences`
        );
        continue;
      }

      const regionId = regionIdMap.get(matchedData.region);
      if (!regionId) continue;

      for (const ethnicity of matchedData.ethnicities) {
        // Créer les presences pour les groupes parents
        if (ethnicity.isGroupWithSubgroups) {
          const parentSlug =
            getEthnicityKey(ethnicity.groupName) ||
            normalizeToKey(ethnicity.groupName);
          const parentId = ethnicityIdMap.get(parentSlug);

          if (parentId) {
            // Calculer le pourcentage dans la région
            const regionTotalPopulation =
              regionPopulations.get(matchedData.region) || 1;
            const percentageInRegion =
              (ethnicity.population / regionTotalPopulation) * 100;

            try {
              await supabase.from("ethnic_group_presence").upsert(
                {
                  ethnic_group_id: parentId,
                  country_id: countryId,
                  population: ethnicity.population,
                  percentage_in_country: ethnicity.percentageInCountry,
                  percentage_in_region: percentageInRegion,
                  percentage_in_africa: ethnicity.percentageInAfrica,
                  region: ethnicity.region || null,
                },
                {
                  onConflict: "ethnic_group_id,country_id",
                }
              );
              stats.presences++;
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              console.error(
                `  ✗ Error creating presence for "${ethnicity.groupName}":`,
                message
              );
              stats.errors++;
            }
          }

          // Créer les presences pour les sous-groupes
          for (const subgroup of ethnicity.subGroups) {
            const subgroupSlug =
              getEthnicityKey(subgroup.name) || normalizeToKey(subgroup.name);
            const subgroupId = ethnicityIdMap.get(subgroupSlug);

            if (subgroupId) {
              const regionTotalPopulation =
                regionPopulations.get(matchedData.region) || 1;
              const percentageInRegion =
                (subgroup.population / regionTotalPopulation) * 100;

              try {
                await supabase.from("ethnic_group_presence").upsert(
                  {
                    ethnic_group_id: subgroupId,
                    country_id: countryId,
                    population: subgroup.population,
                    percentage_in_country: subgroup.percentageInCountry,
                    percentage_in_region: percentageInRegion,
                    percentage_in_africa: subgroup.percentageInAfrica,
                    region: ethnicity.region || null,
                  },
                  {
                    onConflict: "ethnic_group_id,country_id",
                  }
                );
                stats.presences++;
              } catch (error: unknown) {
                const message =
                  error instanceof Error ? error.message : String(error);
                console.error(
                  `  ✗ Error creating presence for subgroup "${subgroup.name}":`,
                  message
                );
                stats.errors++;
              }
            }
          }
        } else {
          // Ethnie standalone
          const ethnicitySlug =
            getEthnicityKey(ethnicity.groupName) ||
            normalizeToKey(ethnicity.groupName);
          const ethnicityId = ethnicityIdMap.get(ethnicitySlug);

          if (ethnicityId) {
            const regionTotalPopulation =
              regionPopulations.get(matchedData.region) || 1;
            const percentageInRegion =
              (ethnicity.population / regionTotalPopulation) * 100;

            try {
              await supabase.from("ethnic_group_presence").upsert(
                {
                  ethnic_group_id: ethnicityId,
                  country_id: countryId,
                  population: ethnicity.population,
                  percentage_in_country: ethnicity.percentageInCountry,
                  percentage_in_region: percentageInRegion,
                  percentage_in_africa: ethnicity.percentageInAfrica,
                  region: ethnicity.region || null,
                },
                {
                  onConflict: "ethnic_group_id,country_id",
                }
              );
              stats.presences++;
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              console.error(
                `  ✗ Error creating presence for "${ethnicity.groupName}":`,
                message
              );
              stats.errors++;
            }
          }
        }

        // Créer les relations langues
        for (let i = 0; i < ethnicity.languages.length; i++) {
          const languageName = ethnicity.languages[i];
          const languageId = languageIdMap.get(languageName);

          if (languageId) {
            const ethnicitySlug =
              getEthnicityKey(ethnicity.groupName) ||
              normalizeToKey(ethnicity.groupName);
            const ethnicityId = ethnicityIdMap.get(ethnicitySlug);

            if (ethnicityId) {
              try {
                await supabase.from("ethnic_group_languages").upsert(
                  {
                    ethnic_group_id: ethnicityId,
                    language_id: languageId,
                    is_primary: i === 0, // Première langue = primaire
                  },
                  {
                    onConflict: "ethnic_group_id,language_id",
                  }
                );
              } catch (error) {
                // Ignorer les erreurs de doublons
              }
            }
          }
        }

        // Créer les relations sources
        for (const sourceTitle of ethnicity.sources) {
          const sourceId = sourceIdMap.get(sourceTitle);

          if (sourceId) {
            const ethnicitySlug =
              getEthnicityKey(ethnicity.groupName) ||
              normalizeToKey(ethnicity.groupName);
            const ethnicityId = ethnicityIdMap.get(ethnicitySlug);

            if (ethnicityId) {
              try {
                await supabase.from("ethnic_group_sources").upsert(
                  {
                    ethnic_group_id: ethnicityId,
                    source_id: sourceId,
                  },
                  {
                    onConflict: "ethnic_group_id,source_id",
                  }
                );
              } catch (error) {
                // Ignorer les erreurs de doublons
              }
            }
          }
        }
      }
    }

    // Final report
    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log("=".repeat(50));
    console.log(`  Regions:     ${stats.regions}`);
    console.log(`  Countries:   ${stats.countries}`);
    console.log(`  Ethnicities: ${stats.ethnicities}`);
    console.log(`  Subgroups:   ${stats.subgroups}`);
    console.log(`  Presences:   ${stats.presences}`);
    console.log(`  Languages:   ${stats.languages}`);
    console.log(`  Sources:     ${stats.sources}`);
    console.log(`  Errors:      ${stats.errors}`);
    console.log("=".repeat(50));

    if (stats.errors > 0) {
      console.log(
        "\n⚠️  Some errors occurred during migration. Please review the logs above."
      );
      process.exit(1);
    } else {
      console.log("\n✅ Migration completed successfully!");

      // Invalider le cache Next.js
      await invalidateCache();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Fatal error during migration:", message);
    process.exit(1);
  }
}

// Run migration
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
