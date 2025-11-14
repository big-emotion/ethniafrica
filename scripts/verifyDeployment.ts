/**
 * Script de vérification avant déploiement
 * Vérifie que toutes les migrations sont appliquées et que les données sont prêtes
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Charger les variables d'environnement
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Variables d'environnement manquantes :");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nVérifiez votre fichier .env.local");
  process.exit(1);
}

const createAdminClient = () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

async function verifyMigrations() {
  console.log("🔍 Vérification des migrations...\n");

  const supabase = createAdminClient();
  let allGood = true;

  // Vérifier la migration 001 : Tables de base
  console.log("1. Vérification du schéma initial (migration 001)...");
  const { data: regions, error: regionsError } = await supabase
    .from("african_regions")
    .select("id")
    .limit(1);

  if (regionsError) {
    console.error("   ❌ Table african_regions non trouvée");
    console.error("   → Appliquer la migration 001_initial_schema.sql");
    allGood = false;
  } else {
    console.log("   ✅ Table african_regions existe");
  }

  const { data: countries, error: countriesError } = await supabase
    .from("countries")
    .select("id")
    .limit(1);

  if (countriesError) {
    console.error("   ❌ Table countries non trouvée");
    console.error("   → Appliquer la migration 001_initial_schema.sql");
    allGood = false;
  } else {
    console.log("   ✅ Table countries existe");
  }

  const { data: ethnicGroups, error: ethnicGroupsError } = await supabase
    .from("ethnic_groups")
    .select("id")
    .limit(1);

  if (ethnicGroupsError) {
    console.error("   ❌ Table ethnic_groups non trouvée");
    console.error("   → Appliquer la migration 001_initial_schema.sql");
    allGood = false;
  } else {
    console.log("   ✅ Table ethnic_groups existe");
  }

  // Vérifier la migration 002 : Champs enrichis
  console.log("\n2. Vérification des champs enrichis (migration 002)...");

  const { data: countrySample, error: countrySampleError } = await supabase
    .from("countries")
    .select("description, ancient_names")
    .limit(1);

  if (countrySampleError) {
    console.error(
      "   ❌ Erreur lors de la vérification des colonnes countries"
    );
    allGood = false;
  } else {
    const hasDescription =
      countrySample && countrySample[0] && "description" in countrySample[0];
    const hasAncientNames =
      countrySample && countrySample[0] && "ancient_names" in countrySample[0];

    if (!hasDescription || !hasAncientNames) {
      console.error("   ❌ Colonnes enrichies manquantes dans countries");
      console.error("   → Appliquer la migration 002_add_enriched_fields.sql");
      allGood = false;
    } else {
      console.log("   ✅ Colonnes enrichies présentes dans countries");
    }
  }

  const { data: ethnicitySample, error: ethnicitySampleError } = await supabase
    .from("ethnic_groups")
    .select("description, ancient_name, society_type, religion")
    .limit(1);

  if (ethnicitySampleError) {
    console.error(
      "   ❌ Erreur lors de la vérification des colonnes ethnic_groups"
    );
    allGood = false;
  } else {
    const hasDescription =
      ethnicitySample &&
      ethnicitySample[0] &&
      "description" in ethnicitySample[0];
    const hasAncientName =
      ethnicitySample &&
      ethnicitySample[0] &&
      "ancient_name" in ethnicitySample[0];
    const hasSocietyType =
      ethnicitySample &&
      ethnicitySample[0] &&
      "society_type" in ethnicitySample[0];
    const hasReligion =
      ethnicitySample && ethnicitySample[0] && "religion" in ethnicitySample[0];

    if (!hasDescription || !hasAncientName || !hasSocietyType || !hasReligion) {
      console.error("   ❌ Colonnes enrichies manquantes dans ethnic_groups");
      console.error("   → Appliquer la migration 002_add_enriched_fields.sql");
      allGood = false;
    } else {
      console.log("   ✅ Colonnes enrichies présentes dans ethnic_groups");
    }
  }

  const { data: presenceSample, error: presenceSampleError } = await supabase
    .from("ethnic_group_presence")
    .select("region")
    .limit(1);

  if (presenceSampleError) {
    console.error(
      "   ❌ Erreur lors de la vérification de ethnic_group_presence"
    );
    allGood = false;
  } else {
    const hasRegion =
      presenceSample && presenceSample[0] && "region" in presenceSample[0];

    if (!hasRegion) {
      console.error(
        "   ❌ Colonne region manquante dans ethnic_group_presence"
      );
      console.error("   → Appliquer la migration 002_add_enriched_fields.sql");
      allGood = false;
    } else {
      console.log("   ✅ Colonne region présente dans ethnic_group_presence");
    }
  }

  // Vérifier les données
  console.log("\n3. Vérification des données...");

  const { count: regionsCount } = await supabase
    .from("african_regions")
    .select("*", { count: "exact", head: true });

  if (regionsCount === 0) {
    console.warn("   ⚠️  Aucune région trouvée");
    console.warn("   → Exécuter les scripts de migration des données");
  } else {
    console.log(`   ✅ ${regionsCount} région(s) trouvée(s)`);
  }

  const { count: countriesCount } = await supabase
    .from("countries")
    .select("*", { count: "exact", head: true });

  if (countriesCount === 0) {
    console.warn("   ⚠️  Aucun pays trouvé");
    console.warn("   → Exécuter les scripts de migration des données");
  } else {
    console.log(`   ✅ ${countriesCount} pays trouvé(s)`);
  }

  const { count: ethnicitiesCount } = await supabase
    .from("ethnic_groups")
    .select("*", { count: "exact", head: true });

  if (ethnicitiesCount === 0) {
    console.warn("   ⚠️  Aucune ethnie trouvée");
    console.warn("   → Exécuter les scripts de migration des données");
  } else {
    console.log(`   ✅ ${ethnicitiesCount} ethnie(s) trouvée(s)`);
  }

  // Vérifier les données enrichies
  console.log("\n4. Vérification des données enrichies...");

  const { data: enrichedCountries, count: enrichedCountriesCount } =
    await supabase
      .from("countries")
      .select("description, ancient_names", { count: "exact" })
      .not("description", "is", null)
      .limit(1);

  if (enrichedCountriesCount === 0) {
    console.warn("   ⚠️  Aucun pays avec description trouvé");
    console.warn("   → Les données enrichies n'ont peut-être pas été migrées");
  } else {
    console.log(`   ✅ ${enrichedCountriesCount} pays avec données enrichies`);
  }

  const { data: enrichedEthnicities, count: enrichedEthnicitiesCount } =
    await supabase
      .from("ethnic_groups")
      .select("description, ancient_name", { count: "exact" })
      .not("description", "is", null)
      .limit(1);

  if (enrichedEthnicitiesCount === 0) {
    console.warn("   ⚠️  Aucune ethnie avec description trouvée");
    console.warn("   → Les données enrichies n'ont peut-être pas été migrées");
  } else {
    console.log(
      `   ✅ ${enrichedEthnicitiesCount} ethnie(s) avec données enrichies`
    );
  }

  // Vérifier les sous-groupes
  console.log("\n5. Vérification des relations hiérarchiques...");

  const { data: subgroups, count: subgroupsCount } = await supabase
    .from("ethnic_groups")
    .select("parent_id", { count: "exact" })
    .not("parent_id", "is", null)
    .limit(1);

  if (subgroupsCount === 0) {
    console.log(
      "   ℹ️  Aucun sous-groupe trouvé (normal si pas de données avec sous-groupes)"
    );
  } else {
    console.log(`   ✅ ${subgroupsCount} sous-groupe(s) trouvé(s)`);
  }

  // Résumé
  console.log("\n" + "=".repeat(50));
  if (allGood) {
    console.log("✅ Toutes les migrations sont appliquées correctement !");
    console.log("\n📋 Prochaines étapes :");
    console.log("   1. Vérifier que les données sont complètes");
    console.log("   2. Tester l'application localement");
    console.log("   3. Déployer sur staging puis production");
  } else {
    console.log("❌ Des problèmes ont été détectés.");
    console.log("\n📋 Actions requises :");
    console.log("   1. Appliquer les migrations SQL manquantes");
    console.log("   2. Relancer ce script pour vérifier");
    console.log("   3. Consulter docs/DEPLOYMENT.md pour plus de détails");
    process.exit(1);
  }
  console.log("=".repeat(50) + "\n");
}

async function main() {
  try {
    await verifyMigrations();
  } catch (error) {
    console.error("\n❌ Erreur lors de la vérification :", error);
    console.error("\nVérifiez que :");
    console.error(
      "   - Les variables d'environnement Supabase sont configurées"
    );
    console.error("   - Vous avez accès à la base de données");
    process.exit(1);
  }
}

main();
