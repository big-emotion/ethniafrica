import { ficheCopy } from "@/lib/i18n/copy/fiche";
import type { PeopleLanguageData } from "@/lib/peopleDataTransformer";
import { getFamilyRoute } from "@/lib/routing";
import type { LanguageReference } from "@/types/afrik";
import type { Language } from "@/types/shared";

import { splitLeadSentence } from "./prose";
import type { FicheTileData } from "./tileData";

/**
 * The language chapter both records share, as tiles.
 *
 * A people's family is one click away by its name, and never by its corpus
 * key: without a name the tile keeps silent. A country's languages are names
 * with their codes, capitalised for display — the corpus files "ovambo" and
 * "langues khoïsan" in lower case, and the bubbles printed them so — and no
 * pictogram stands for "official".
 */

function capitalise(name: string, language: Language): string {
  return name.charAt(0).toLocaleUpperCase(language) + name.slice(1);
}

/** "Oshikwanyama (kua) — standard écrit" → "Oshikwanyama (kua)". */
function shortName(entry: string): string {
  return entry.split(/\s+[—–]\s+/u)[0].trim();
}

function previewList(names: string[]): string {
  const rest = names.length - 3;
  return [...names.slice(0, 3), ...(rest > 0 ? [`+${rest}`] : [])].join(" · ");
}

// @req REQ-091
export function peopleLanguageTiles(
  data: PeopleLanguageData,
  familyName: string | undefined,
  language: Language
): FicheTileData[] {
  const copy = ficheCopy[language].languages;
  const tiles: FicheTileData[] = [];

  const main = data.mainLanguage?.trim();
  const codes = data.isoCodes.map((code) => code.trim()).filter(Boolean);
  if (main || codes.length) {
    const [name, ...gloss] = main ? main.split(/\s+[—–]\s+/u) : [""];
    tiles.push({
      key: "main",
      label: copy.main,
      ...(name ? { value: name } : {}),
      preview: gloss.join(" — ") || (name ? "" : codes.join(" · ")),
      passages: [],
      ...(codes.length
        ? { pills: codes.map((code) => ({ label: code })) }
        : {}),
    });
  }

  const family = familyName?.trim();
  if (data.languageFamilyId && family) {
    tiles.push({
      key: "family",
      label: copy.family,
      value: family,
      valueHref: getFamilyRoute(language, data.languageFamilyId),
      preview: "",
      passages: [],
    });
  }

  const dialects = data.dialects
    .map((dialect) => dialect.trim())
    .filter(Boolean);
  if (dialects.length) {
    tiles.push({
      key: "dialects",
      label: copy.dialects,
      value: copy.dialectCount(dialects.length),
      preview: previewList(dialects.map(shortName)),
      passages: [],
      pills: dialects.map((dialect) => ({ label: dialect })),
      wide: true,
    });
  }

  const vehicular = data.vehicularRole?.trim();
  if (vehicular) {
    tiles.push({
      key: "vehicular",
      label: copy.vehicular,
      preview: splitLeadSentence(vehicular).lead,
      passages: [{ field: "vehicularRole", text: vehicular }],
      wide: true,
    });
  }

  return tiles;
}

// @req REQ-091 REQ-145
export function countryLanguageTiles(
  references: readonly LanguageReference[],
  language: Language
): FicheTileData[] {
  const copy = ficheCopy[language].languages;
  const items = references
    .map((reference) => ({
      name: capitalise(
        reference.name.replace(/\s*\(.*\)/, "").trim(),
        language
      ),
      code: reference.isoCode,
      official:
        reference.isPrimary === true || /officiel/i.test(reference.name),
    }))
    .filter((item) => item.name);
  const official = items.filter((item) => item.official);
  const others = items.filter((item) => !item.official);
  const tiles: FicheTileData[] = [];

  if (official.length) {
    tiles.push({
      key: "official",
      label: copy.official,
      value: official.map((item) => item.name).join(" · "),
      preview: official
        .map((item) => item.code)
        .filter(Boolean)
        .join(" · "),
      passages: [],
      // Across the row: half of it beside the full-width list left a hole.
      wide: true,
    });
  }

  if (others.length) {
    tiles.push({
      key: official.length ? "others" : "all",
      label: official.length ? copy.others : copy.all,
      value: copy.languageCount(others.length),
      preview: previewList(others.map((item) => item.name)),
      passages: [],
      pills: others.map((item) => ({
        label: item.name,
        ...(item.code ? { code: item.code } : {}),
      })),
      wide: true,
    });
  }

  return tiles;
}
