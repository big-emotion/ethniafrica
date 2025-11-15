/**
 * Script pour réinitialiser complètement la base de données
 * ⚠️ ATTENTION : Ce script supprime TOUTES les données !
 *
 * Usage: tsx scripts/resetDatabase.ts
 *
 * Ce script supprime toutes les données des tables dans l'ordre approprié
 * pour respecter les contraintes de clés étrangères.
 *
 * Après l'exécution, vous devrez réexécuter les scripts de migration :
 * 1. tsx scripts/parseEnrichedCountryCSV.ts
 * 2. tsx scripts/parseCountryDescriptions.ts
 * 3. tsx scripts/matchCSVAndDescriptions.ts
 * 4. tsx scripts/migrateEnrichedData.ts
 */

// Load environment variables from .env.local
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { createAdminClient } from "../src/lib/supabase/admin";

/**
 * Formate une erreur pour l'affichage
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
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

  return String(error);
}

async function resetDatabase() {
  console.log("=".repeat(60));
  console.log("⚠️  ATTENTION : Ce script va supprimer TOUTES les données !");
  console.log("=".repeat(60));
  console.log("\nTables qui seront vidées :");
  console.log("  - ethnic_group_sources");
  console.log("  - ethnic_group_languages");
  console.log("  - ethnic_group_presence");
  console.log("  - ethnic_groups");
  console.log("  - countries");
  console.log("  - african_regions");
  console.log("  - languages");
  console.log("  - sources");
  console.log("\n" + "=".repeat(60) + "\n");

  const supabase = createAdminClient();

  // Ordre de suppression (respecter les contraintes de clés étrangères)
  // On supprime d'abord les tables de relations, puis les tables principales
  const tables = [
    {
      name: "ethnic_group_sources",
      description: "Relations ethnies-sources",
    },
    {
      name: "ethnic_group_languages",
      description: "Relations ethnies-langues",
    },
    {
      name: "ethnic_group_presence",
      description: "Présences des ethnies dans les pays",
    },
    {
      name: "ethnic_groups",
      description: "Groupes ethniques",
    },
    {
      name: "countries",
      description: "Pays",
    },
    {
      name: "african_regions",
      description: "Régions africaines",
    },
    {
      name: "languages",
      description: "Langues",
    },
    {
      name: "sources",
      description: "Sources de données",
    },
  ];

  console.log("🗑️  Suppression des données...\n");

  let successCount = 0;
  let errorCount = 0;

  for (const table of tables) {
    try {
      // D'abord, compter le nombre de lignes
      const { count: initialCount } = await supabase
        .from(table.name)
        .select("*", { count: "exact", head: true });

      if (initialCount === 0) {
        console.log(`  ✓ ${table.name} (déjà vide)`);
        successCount++;
        continue;
      }

      // Supprimer toutes les lignes
      // Pour Supabase, on doit utiliser une condition, donc on utilise une condition toujours vraie
      // On utilise neq avec un UUID impossible (toutes les lignes ont un id différent de celui-ci)
      const { data, error, count } = await supabase
        .from(table.name)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
        .select();

      if (error) {
        // Si l'erreur est "no rows", c'est normal (table déjà vide)
        if (
          error.code === "PGRST116" ||
          error.message.includes("no rows") ||
          error.message.includes("No rows found")
        ) {
          console.log(`  ✓ ${table.name} (déjà vide)`);
          successCount++;
        } else {
          console.error(
            `  ✗ Erreur lors de la suppression de ${table.name}:`,
            formatError(error)
          );
          errorCount++;
        }
      } else {
        // Compter le nombre de lignes supprimées
        const deletedCount = count || (data ? data.length : initialCount || 0);
        console.log(
          `  ✓ ${table.name} vidée (${deletedCount} ligne(s) supprimée(s))`
        );
        successCount++;
      }
    } catch (error) {
      console.error(
        `  ✗ Erreur lors de la suppression de ${table.name}:`,
        formatError(error)
      );
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Résumé :");
  console.log(`  ✓ ${successCount} table(s) vidée(s) avec succès`);
  if (errorCount > 0) {
    console.log(`  ✗ ${errorCount} erreur(s)`);
  }
  console.log("=".repeat(60));

  if (errorCount === 0) {
    console.log("\n✅ Base de données réinitialisée avec succès !");
    console.log("\n💡 Prochaines étapes :");
    console.log("   1. tsx scripts/parseEnrichedCountryCSV.ts");
    console.log("   2. tsx scripts/parseCountryDescriptions.ts");
    console.log("   3. tsx scripts/matchCSVAndDescriptions.ts");
    console.log("   4. tsx scripts/migrateEnrichedData.ts");
  } else {
    console.log(
      "\n⚠️  Certaines erreurs sont survenues. Vérifiez les messages ci-dessus."
    );
    process.exit(1);
  }
}

// Exécuter le script
resetDatabase().catch((error) => {
  console.error("\n❌ Erreur fatale :", formatError(error));
  process.exit(1);
});
