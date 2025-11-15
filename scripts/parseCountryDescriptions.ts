import * as fs from "fs";
import * as path from "path";
import { normalizeToKey } from "../src/lib/normalize";

interface AncientNameEntry {
  period: string;
  names: string[];
}

interface ParsedCountryDescription {
  countryName: string;
  region: string;
  ancientNames: AncientNameEntry[]; // Max 3 entrées
  description: string;
  ethnicGroupsSummary?: string; // Section 4
  notes?: string; // Section 6
  ethnicities: ParsedEthnicityDescription[];
}

interface ParsedEthnicityDescription {
  name: string;
  normalizedName: string;
  ancientName: string[]; // Max 3
  description: string;
}

// Normaliser un nom pour le matching
function normalizeName(name: string): string {
  return normalizeToKey(name.toLowerCase());
}

// Extraire un nom propre depuis une ligne (enlever dates, parenthèses, etc.)
function extractNameFromLine(
  line: string,
  preferAfterColon = false
): string | null {
  // Enlever les emojis
  let cleaned = line.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();

  // Si la ligne commence par un tiret ou une puce
  if (cleaned.match(/^[-•]\s*/)) {
    cleaned = cleaned.replace(/^[-•]\s*/, "").trim();
  }

  // Si la ligne contient "→", prendre la partie après (ex: "→ Apparaît le terme Maghrib al-Aqsa")
  if (cleaned.includes("→")) {
    const parts = cleaned.split("→");
    if (parts.length > 1) {
      cleaned = parts[1].trim();
      // Enlever les préfixes comme "Apparaît le terme", "Nommé", etc.
      cleaned = cleaned
        .replace(
          /^(Apparaît|Apparaissent|Nommé|Nommée|Nommés|Nommées|Le terme|Les termes|Le nom|Les noms)[\s:]+/i,
          ""
        )
        .trim();
    }
  }

  // Si la ligne contient ":", prendre la partie appropriée
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    if (preferAfterColon && parts.length > 1) {
      cleaned = parts[1].trim();
    } else if (!preferAfterColon && parts.length > 0) {
      cleaned = parts[0].trim();
    }
  }

  // Enlever les dates entre parenthèses (ex: "(IIIe siècle av. J.-C. – 46 av. J.-C.)")
  cleaned = cleaned.replace(/\s*\([^)]*\d+[^)]*\)/g, "").trim();

  // Enlever les parenthèses simples à la fin
  cleaned = cleaned.replace(/\s*\([^)]*\)$/, "").trim();

  // Enlever les guillemets
  cleaned = cleaned.replace(/[""]/g, "").trim();

  // Enlever les numéros au début (ex: "1. ", "2) ")
  cleaned = cleaned.replace(/^\d+[.)]\s*/, "").trim();

  // Enlever les préfixes comme "Nom :", "Nom officiel :", etc.
  cleaned = cleaned
    .replace(
      /^(Nom|Nom officiel|État|Pays|Territoire|Le pays|Le territoire)[\s:]+/i,
      ""
    )
    .trim();

  // Enlever les suffixes comme "– royaumes...", "— ..."
  cleaned = cleaned.split(/[–—]/)[0].trim();

  // Si la ligne est trop longue (probablement une description), ne pas la prendre
  if (cleaned.length > 100) {
    return null;
  }

  // Ignorer les lignes qui sont clairement des descriptions
  if (
    cleaned.match(
      /^(Le|La|Les|Un|Une|Des|Ce|Cette|Ces|Il|Elle|Ils|Elles|C'est|C'était|Le territoire|Le pays)/i
    ) ||
    cleaned.match(
      /^(est|était|sont|étaient|a|ont|avait|avaient|s'appelle|se nomme|était composé|était habité)/i
    ) ||
    cleaned.length < 2
  ) {
    return null;
  }

  return cleaned.length > 0 ? cleaned : null;
}

// Parser un fichier de description texte libre
function parseDescriptionFile(
  filePath: string,
  countryName: string,
  region: string
): ParsedCountryDescription | null {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").map((line) => line.trim());

  const result: ParsedCountryDescription = {
    countryName,
    region,
    ancientNames: [],
    description: "",
    ethnicGroupsSummary: undefined,
    notes: undefined,
    ethnicities: [],
  };

  let currentSection: "country" | "ethnicities" | null = null;
  let currentEthnicity: ParsedEthnicityDescription | null = null;
  let collectingDescription = false;
  let collectingAncientNames = false;
  let collectingEthnicGroupsSummary = false;
  let collectingNotes = false;
  let descriptionLines: string[] = [];
  let ethnicGroupsSummaryLines: string[] = [];
  let notesLines: string[] = [];
  let ancientNamesSectionEnd = -1;
  let descriptionSectionEnd = -1;
  let ethnicGroupsSummarySectionEnd = -1;
  let notesSectionEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Détecter la section PAYS (format structuré)
    if (line.match(/^#+\s*PAYS/i)) {
      currentSection = "country";
      collectingDescription = false;
      collectingAncientNames = false;
      collectingEthnicGroupsSummary = false;
      collectingNotes = false;
      descriptionLines = [];
      continue;
    }

    // Détecter la section 3 : RÉSUMÉ HISTORIQUE
    if (
      line.match(/^3\.\s*RÉSUMÉ\s+HISTORIQUE/i) ||
      line.match(/^3\.\s*Résumé\s+historique/i)
    ) {
      // S'assurer qu'on est en mode country
      if (!currentSection) {
        currentSection = "country";
      }
      collectingDescription = true;
      collectingAncientNames = false;
      collectingEthnicGroupsSummary = false;
      collectingNotes = false;
      descriptionLines = [];
      descriptionSectionEnd = -1;

      // Chercher où se termine la section (prochaine section numérotée)
      for (let j = i + 1; j < lines.length && j < i + 200; j++) {
        if (
          lines[j].match(/^4\./) ||
          lines[j].match(/^5\./) ||
          lines[j].match(/^6\./) ||
          lines[j].match(/^#+\s*ETHNIES/i) ||
          lines[j].match(/GROUPE[S]?\s+ETHNIQUE[S]?/i)
        ) {
          descriptionSectionEnd = j;
          break;
        }
      }
      continue;
    }

    // Détecter la section 4 : RÉSUMÉ DÉTAILLÉ DES GROUPES ETHNIQUES
    if (
      line.match(/^4\.\s*RÉSUMÉ\s+DÉTAILLÉ\s+DES\s+GROUPES\s+ETHNIQUES/i) ||
      line.match(/^4\.\s*Résumé\s+détaillé\s+des\s+groupes\s+ethniques/i)
    ) {
      collectingEthnicGroupsSummary = true;
      collectingDescription = false;
      collectingAncientNames = false;
      collectingNotes = false;
      ethnicGroupsSummaryLines = [];
      ethnicGroupsSummarySectionEnd = -1;

      // Chercher où se termine la section (prochaine section numérotée)
      for (let j = i + 1; j < lines.length && j < i + 200; j++) {
        if (
          lines[j].match(/^5\./) ||
          lines[j].match(/^6\./) ||
          lines[j].match(/^#+\s*ETHNIES/i) ||
          lines[j].match(/GROUPE[S]?\s+ETHNIQUE[S]?/i)
        ) {
          ethnicGroupsSummarySectionEnd = j;
          break;
        }
      }
      continue;
    }

    // Détecter la section 6 : NOTES / POINTS IMPORTANTS
    if (
      line.match(/^6\.\s*NOTES\s*\/\s*POINTS\s*IMPORTANTS/i) ||
      line.match(/^6\.\s*Notes\s*\/\s*Points\s*importants/i) ||
      line.match(/^6\.\s*NOTES/i) ||
      line.match(/^6\.\s*Notes/i)
    ) {
      collectingNotes = true;
      collectingDescription = false;
      collectingAncientNames = false;
      collectingEthnicGroupsSummary = false;
      notesLines = [];
      notesSectionEnd = -1;

      // Chercher où se termine la section (fin de fichier ou prochaine section majeure)
      for (let j = i + 1; j < lines.length && j < i + 200; j++) {
        if (
          lines[j].match(/^[1-9]\./) ||
          lines[j].match(/^#+\s*ETHNIES/i) ||
          lines[j].match(/GROUPE[S]?\s+ETHNIQUE[S]?/i)
        ) {
          notesSectionEnd = j;
          break;
        }
      }
      continue;
    }

    // Détecter la section ETHNIES (mais pas si on est en train de collecter les anciens noms ou la description)
    // Ne pas passer en mode ethnicities si on est en train de collecter les anciens noms ou la description
    if (
      !collectingAncientNames &&
      !collectingDescription &&
      currentSection !== "ethnicities" &&
      (line.match(/^#+\s*ETHNIES/i) ||
        line.match(/GROUPE[S]?\s+ETHNIQUE[S]?/i) ||
        line.match(/FAMILLE[S]?\s+ETHNIQUE[S]?/i) ||
        (line.match(/PEUPLE[S]?/i) && !line.match(/ancien/i)) ||
        (line.match(/^🟩\s*1\.\s*Peuples/i) && !collectingAncientNames) ||
        (line.match(/^🟦\s*2\.\s*Peuples/i) && !collectingAncientNames) ||
        line.match(/Résumé.*par groupes ethniques/i))
    ) {
      // S'assurer qu'on a fini de collecter les anciens noms
      collectingAncientNames = false;
      currentSection = "ethnicities";
      // Sauvegarder l'ethnie en cours si elle existe
      if (currentEthnicity) {
        currentEthnicity.description = descriptionLines.join("\n").trim();
        result.ethnicities.push(currentEthnicity);
        currentEthnicity = null;
      }
      collectingDescription = false;
      descriptionLines = [];
      continue;
    }

    // Si pas de section PAYS détectée, considérer que tout le début est la section pays
    // ou si on trouve des mentions d'anciens noms/appellations
    if (!currentSection) {
      if (
        i < 200 || // Augmenter la limite pour couvrir plus de lignes
        line.match(/anciennes?\s+appellations?/i) ||
        line.match(/anciens?\s+noms?/i) ||
        line.match(/résumé.*anciens?\s+noms?/i) ||
        line.match(/résumé complet des anciens noms/i)
      ) {
        currentSection = "country";
      }
    }

    // Dans la section PAYS
    if (currentSection === "country" || !currentSection) {
      // Détecter les anciennes appellations - formats variés
      if (
        line.match(/anciennes?\s+appellations?/i) ||
        line.match(/anciens?\s+noms?\s+historiques?/i) ||
        line.match(/anciens?\s+noms?\s+de\s+l['']/i) ||
        line.match(/noms?\s+historiques?/i) ||
        line.match(/appellations?\s+historiques?/i) ||
        line.match(/anciens?\s+noms?/i) ||
        line.match(/noms?\s+anciens?/i) ||
        line.match(/résumé.*anciens?\s+noms?/i) ||
        line.match(/résumé.*des anciens noms/i)
      ) {
        collectingAncientNames = true;
        collectingDescription = false;
        descriptionLines = [];
        ancientNamesSectionEnd = -1;

        // S'assurer qu'on est en mode country
        if (!currentSection) {
          currentSection = "country";
        }

        // Chercher où se termine la section (prochaine section majeure)
        for (let j = i + 1; j < lines.length && j < i + 150; j++) {
          if (
            lines[j].match(/^#+\s*ETHNIES/i) ||
            lines[j].match(/GROUPE[S]?\s+ETHNIQUE[S]?/i) ||
            lines[j].match(/FAMILLE[S]?\s+ETHNIQUE[S]?/i) ||
            lines[j].match(/RÉSUMÉ.*ETHNIQUE/i) ||
            lines[j].match(/Résumé.*par groupes ethniques/i) ||
            lines[j].match(/^🟩\s*1\.\s*Peuples/i) ||
            lines[j].match(/^🟦\s*2\.\s*Peuples/i) ||
            (lines[j].match(/^#+\s*[2-9]/) && !lines[j].match(/ancien/i)) ||
            (lines[j].match(/^#+\s*[12]/) &&
              j > i + 10 &&
              !lines[j].match(/ancien/i))
          ) {
            ancientNamesSectionEnd = j;
            break;
          }
        }
        continue;
      }

      // Collecter les anciens noms dans la section détectée
      if (collectingAncientNames) {
        // Arrêter si on a atteint la fin de la section
        if (ancientNamesSectionEnd > 0 && i >= ancientNamesSectionEnd) {
          collectingAncientNames = false;
        }

        // Extraire les entrées avec période et noms (sans limite)
        if (line) {
          // Ignorer les lignes qui sont clairement des titres
          if (
            line.match(/^#+\s*/) ||
            line.match(/^🟩|^🟦|^🟨|^🟪|^🟧|^🟫|^⬜/) ||
            line.match(/^👉|^✔️|^🧭|^🎯/)
          ) {
            // Ne rien faire pour ces lignes
          }
          // Format principal: "- [Période] : [Noms séparés par virgules]"
          else if (line.match(/^[-•]\s*.+:\s*.+/)) {
            const cleanedLine = line.replace(/^[-•]\s*/, "").trim();
            const colonIndex = cleanedLine.indexOf(":");

            if (colonIndex > 0) {
              const period = cleanedLine.substring(0, colonIndex).trim();
              const namesPart = cleanedLine.substring(colonIndex + 1).trim();

              // Extraire les noms (séparés par virgules, avec guillemets possibles)
              const names: string[] = [];

              // Normaliser tous les types de guillemets vers des guillemets droits pour faciliter l'extraction
              // Guillemets typographiques: " " (U+201C U+201D), " " (U+201E U+201C)
              // Guillemets français: « » (U+00AB U+00BB)
              // Guillemets simples: ' ' (U+2018 U+2019)
              const normalized = namesPart
                .replace(/\u201C/g, '"') // LEFT DOUBLE QUOTATION MARK
                .replace(/\u201D/g, '"') // RIGHT DOUBLE QUOTATION MARK
                .replace(/\u201E/g, '"') // DOUBLE LOW-9 QUOTATION MARK
                .replace(/\u00AB/g, '"') // LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
                .replace(/\u00BB/g, '"') // RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
                .replace(/\u2018/g, '"') // LEFT SINGLE QUOTATION MARK
                .replace(/\u2019/g, '"') // RIGHT SINGLE QUOTATION MARK
                .replace(/\u201A/g, '"') // SINGLE LOW-9 QUOTATION MARK
                .replace(/\u201B/g, '"'); // SINGLE HIGH-REVERSED-9 QUOTATION MARK

              // Extraire les noms entre guillemets droits
              const quotedPattern = /"([^"]+)"/g;
              let match;
              const foundQuoted: string[] = [];

              while ((match = quotedPattern.exec(normalized)) !== null) {
                const name = match[1].trim();
                if (name && name.length > 0) {
                  foundQuoted.push(name);
                }
              }

              if (foundQuoted.length > 0) {
                names.push(...foundQuoted);
              } else {
                // Si pas de guillemets trouvés, séparer par virgules
                const splitNames = namesPart.split(",");
                for (const name of splitNames) {
                  // Enlever tous types de guillemets (typographiques et droits)
                  let cleaned = name.replace(/["""«»'']/g, "").trim();
                  // Enlever les points en fin
                  cleaned = cleaned.replace(/\.\s*$/, "").trim();
                  if (cleaned && cleaned.length > 0) {
                    names.push(cleaned);
                  }
                }
              }

              if (period && names.length > 0) {
                result.ancientNames.push({ period, names });
              }
            }
          }
          // Format avec numéro: "1. [Période] : [Noms]"
          else if (line.match(/^\d+[.)]\s*.+:\s*.+/)) {
            const cleanedLine = line.replace(/^\d+[.)]\s*/, "").trim();
            const colonIndex = cleanedLine.indexOf(":");

            if (colonIndex > 0) {
              const period = cleanedLine.substring(0, colonIndex).trim();
              const namesPart = cleanedLine.substring(colonIndex + 1).trim();

              const names: string[] = [];

              // Pattern pour matcher les noms entre guillemets typographiques ou droits
              const quotedPattern =
                /[""]([^""]+)[""]|[""]([^""]+)[""]|«([^»]+)»|'([^']+)'|"([^"]+)"/g;
              let match;
              const foundQuoted = [];

              // Réinitialiser lastIndex pour éviter les problèmes
              quotedPattern.lastIndex = 0;

              while ((match = quotedPattern.exec(namesPart)) !== null) {
                const name = (
                  match[1] ||
                  match[2] ||
                  match[3] ||
                  match[4] ||
                  match[5] ||
                  ""
                ).trim();
                if (name && name.length > 0) {
                  foundQuoted.push(name);
                }
              }

              if (foundQuoted.length > 0) {
                names.push(...foundQuoted);
              } else {
                // Si pas de guillemets, séparer par virgules
                const splitNames = namesPart.split(",");
                for (const name of splitNames) {
                  let cleaned = name.replace(/["""«»'']/g, "").trim();
                  cleaned = cleaned.replace(/\.\s*$/, "").trim();
                  if (cleaned && cleaned.length > 0) {
                    names.push(cleaned);
                  }
                }
              }

              if (period && names.length > 0) {
                result.ancientNames.push({ period, names });
              }
            }
          }
        }
      }

      // Détecter la description du pays
      if (
        line.match(/^###?\s*Description/i) ||
        line.match(/RÉSUMÉ.*COMPLET/i)
      ) {
        collectingDescription = true;
        collectingAncientNames = false;
        descriptionLines = [];
        continue;
      }

      // Collecter la description
      if (collectingDescription) {
        // Arrêter si on a atteint la fin de la section
        if (descriptionSectionEnd > 0 && i >= descriptionSectionEnd) {
          collectingDescription = false;
        } else if (line && !line.match(/^#/) && !line.match(/^[1-9]\./)) {
          descriptionLines.push(line);
        }
      }

      // Collecter la section 4 : Résumé détaillé des groupes ethniques
      if (collectingEthnicGroupsSummary) {
        // Arrêter si on a atteint la fin de la section
        if (
          ethnicGroupsSummarySectionEnd > 0 &&
          i >= ethnicGroupsSummarySectionEnd
        ) {
          collectingEthnicGroupsSummary = false;
        } else if (line && !line.match(/^[1-9]\./)) {
          // Conserver toutes les lignes (y compris les puces)
          ethnicGroupsSummaryLines.push(line);
        }
      }

      // Collecter la section 6 : Notes / Points importants
      if (collectingNotes) {
        // Arrêter si on a atteint la fin de la section
        if (notesSectionEnd > 0 && i >= notesSectionEnd) {
          collectingNotes = false;
        } else if (line && !line.match(/^[1-9]\./)) {
          // Conserver toutes les lignes (y compris les puces)
          notesLines.push(line);
        }
      }
    }

    // Dans la section ETHNIES (mais pas si on est en train de collecter les anciens noms)
    if (currentSection === "ethnicities" && !collectingAncientNames) {
      // Détecter une nouvelle ethnie (### Nom de l'ethnie)
      if (line.match(/^###\s+(.+)$/)) {
        // Sauvegarder l'ethnie précédente si elle existe
        if (currentEthnicity) {
          currentEthnicity.description = descriptionLines.join("\n").trim();
          result.ethnicities.push(currentEthnicity);
        }

        const match = line.match(/^###\s+(.+)$/);
        if (match) {
          const ethnicityName = match[1].trim();
          currentEthnicity = {
            name: ethnicityName,
            normalizedName: normalizeName(ethnicityName),
            ancientName: [],
            description: "",
          };
          collectingDescription = false;
          descriptionLines = [];
        }
        continue;
      }

      // Détecter l'ancien nom d'une ethnie
      if (currentEthnicity && line.match(/^\*\*Ancien\s+nom\*\*:/i)) {
        const ancientNameLine = line.replace(/^\*\*Ancien\s+nom\*\*:\s*/i, "");
        if (ancientNameLine && currentEthnicity.ancientName.length < 3) {
          // Peut contenir plusieurs noms séparés par des virgules
          const names = ancientNameLine
            .split(",")
            .map((n) => n.trim())
            .filter((n) => n.length > 0)
            .slice(0, 3 - currentEthnicity.ancientName.length);
          currentEthnicity.ancientName.push(...names);
        }
        continue;
      }

      // Détecter la description d'une ethnie
      if (currentEthnicity && line.match(/^\*\*Description\*\*:/i)) {
        collectingDescription = true;
        descriptionLines = [];
        const descLine = line.replace(/^\*\*Description\*\*:\s*/i, "");
        if (descLine) {
          descriptionLines.push(descLine);
        }
        continue;
      }

      // Collecter la description de l'ethnie
      if (
        currentEthnicity &&
        collectingDescription &&
        line &&
        !line.match(/^###/) &&
        !line.match(/^\*\*/)
      ) {
        descriptionLines.push(line);
      }
    }
  }

  // Sauvegarder la dernière ethnie
  if (currentEthnicity) {
    currentEthnicity.description = descriptionLines.join("\n").trim();
    result.ethnicities.push(currentEthnicity);
  }

  // Finaliser la description du pays
  result.description = descriptionLines.join("\n").trim();

  // Finaliser la section 4 : Résumé détaillé des groupes ethniques
  if (ethnicGroupsSummaryLines.length > 0) {
    result.ethnicGroupsSummary = ethnicGroupsSummaryLines.join("\n").trim();
  }

  // Finaliser la section 6 : Notes / Points importants
  if (notesLines.length > 0) {
    result.notes = notesLines.join("\n").trim();
  }

  // Si pas de description trouvée, essayer de la trouver autrement
  if (!result.description && currentSection === "country") {
    // Chercher toutes les lignes après "Description" jusqu'à "ETHNIES"
    const descStart = lines.findIndex((l) => l.match(/^###?\s*Description/i));
    const ethStart = lines.findIndex(
      (l) =>
        l.match(/^#+\s*ETHNIES/i) ||
        l.match(/GROUPE[S]?\s+ETHNIQUE[S]?/i) ||
        l.match(/FAMILLE[S]?\s+ETHNIQUE[S]?/i)
    );
    if (descStart !== -1 && ethStart !== -1) {
      result.description = lines
        .slice(descStart + 1, ethStart)
        .filter((l) => l && !l.match(/^###/))
        .join("\n")
        .trim();
    }
  }

  // Ne pas limiter ici - on limitera à 3 seulement pour l'affichage dans la vue détaillée
  // Cela permet d'avoir toutes les entrées dans allAncientNames pour la page dédiée

  return result;
}

// Fonction principale
function main() {
  const sourceDir = path.join(process.cwd(), "dataset", "source");
  const outputDir = path.join(process.cwd(), "dataset", "parsed");

  // Créer le dossier de sortie
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allParsedDescriptions: ParsedCountryDescription[] = [];

  // Parcourir les dossiers de régions
  const regions = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const regionDir of regions) {
    if (!regionDir.isDirectory()) continue;

    const region = regionDir.name;
    const regionPath = path.join(sourceDir, region);

    // Parcourir les dossiers de pays
    const countries = fs.readdirSync(regionPath, { withFileTypes: true });
    for (const countryDir of countries) {
      if (!countryDir.isDirectory()) continue;

      const countryName = countryDir.name;
      const countryPath = path.join(regionPath, countryName);

      // Chercher le fichier de description (.txt)
      const txtFiles = fs
        .readdirSync(countryPath)
        .filter((f) => f.endsWith(".txt"));

      if (txtFiles.length === 0) {
        console.warn(
          `⚠️  Aucun fichier de description trouvé pour ${countryName} dans ${region}`
        );
        continue;
      }

      const txtPath = path.join(countryPath, txtFiles[0]);
      console.log(`📄 Parsing description ${region}/${countryName}...`);

      try {
        const parsedDescription = parseDescriptionFile(
          txtPath,
          countryName,
          region
        );
        if (parsedDescription) {
          allParsedDescriptions.push(parsedDescription);

          // Sauvegarder le JSON parsé
          const outputPath = path.join(
            outputDir,
            `${region}_${countryName}_description.json`
          );
          fs.writeFileSync(
            outputPath,
            JSON.stringify(parsedDescription, null, 2),
            "utf-8"
          );
          console.log(`  ✓ Parsed and saved to ${outputPath}`);
          console.log(
            `    - ${parsedDescription.ancientNames.length} anciennes appellations`
          );
          console.log(
            `    - ${parsedDescription.ethnicities.length} ethnies avec descriptions`
          );
          if (parsedDescription.ethnicGroupsSummary) {
            console.log(`    - Section 4 (Résumé détaillé) trouvée`);
          }
          if (parsedDescription.notes) {
            console.log(`    - Section 6 (Notes) trouvée`);
          }
        }
      } catch (error) {
        console.error(
          `  ✗ Erreur lors du parsing de la description de ${countryName}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  // Sauvegarder un fichier global
  const globalOutputPath = path.join(outputDir, "all_descriptions.json");
  fs.writeFileSync(
    globalOutputPath,
    JSON.stringify(allParsedDescriptions, null, 2),
    "utf-8"
  );

  console.log("\n✅ Parsing des descriptions terminé!");
  console.log(
    `📊 ${allParsedDescriptions.length} pays avec descriptions parsés`
  );
  console.log(`📁 Fichiers sauvegardés dans: ${outputDir}`);
}

main();
