/**
 * Script wrapper pour exécution par l'agent avec accès à web_search tool
 *
 * Ce script doit être exécuté par l'agent qui a accès à web_search.
 * L'agent appellera web_search pour chaque pays et passera les résultats au script principal.
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const SCRIPT_PATH = path.join(ROOT, "scripts", "syncPeuplesWithWebSearch.ts");

// Cette fonction sera appelée par l'agent pour un pays spécifique
export async function syncCountryWithWebSearch(
  countryCode: string,
  countryName: string,
  webSearchFunction: (query: string) => Promise<string>
): Promise<void> {
  console.log(
    `\n=== Synchronisation avec recherche web : ${countryName} (${countryCode}) ===\n`
  );

  // Importer le script principal
  const { setSearchResults, setEnrichmentResults } = await import(
    "./syncPeuplesWithWebSearch"
  );

  // Requêtes de recherche
  const searchQueries = [
    `liste complète groupes ethniques peuples ${countryName}`,
    `ethnic groups ${countryName} complete list`,
    `peuples autochtones ${countryName} liste exhaustive`,
    `tribus ${countryName} clans ethnies`,
    `indigenous peoples ${countryName} list`,
  ];

  console.log(`Recherche web pour ${countryName}...\n`);

  // Appeler web_search pour chaque requête
  const allResults: string[] = [];
  for (const query of searchQueries) {
    console.log(`  🔍 Recherche: "${query}"`);
    try {
      const result = await webSearchFunction(query);
      allResults.push(result);
      console.log(`  ✓ Résultat obtenu (${result.length} caractères)`);
    } catch (e) {
      console.error(`  ✗ Erreur recherche: ${e}`);
    }
  }

  // Parser et sauvegarder les résultats
  if (allResults.length > 0) {
    setSearchResults(countryCode, countryName, allResults);
  }

  // Maintenant exécuter le script principal qui utilisera les résultats en cache
  console.log(`\nExécution du script principal...\n`);
  // Le script principal sera exécuté séparément avec les résultats en cache
}

// Fonction pour enrichir un peuple spécifique
export async function enrichPeopleWithWebSearch(
  peopleName: string,
  countryName: string,
  webSearchFunction: (query: string) => Promise<string>
): Promise<void> {
  const queries = [
    `${peopleName} origines migrations appellations ${countryName}`,
    `${peopleName} ${countryName} histoire culture`,
    `${peopleName} langue ISO 639-3`,
  ];

  const allResults: string[] = [];
  for (const query of queries) {
    try {
      const result = await webSearchFunction(query);
      allResults.push(result);
    } catch (e) {
      console.error(`  ✗ Erreur enrichissement: ${e}`);
    }
  }

  if (allResults.length > 0) {
    const { setEnrichmentResults } = await import("./syncPeuplesWithWebSearch");
    setEnrichmentResults(peopleName, allResults);
  }
}
