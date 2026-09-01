import type { PublicLanguage } from "@/api/v2/schemas/languages";

interface LanguageAggregate {
  id: PublicLanguage["id"];
  name: PublicLanguage["name"];
  nameProvenance: PublicLanguage["nameProvenance"];
  family: PublicLanguage["family"];
  speakingPeoples: PublicLanguage["speakingPeoples"];
  vehicularRole: PublicLanguage["vehicularRole"];
  vitalityStatus: PublicLanguage["vitalityStatus"];
  sources: PublicLanguage["sources"];
}

function comparePeopleByName(
  left: PublicLanguage["speakingPeoples"][number],
  right: PublicLanguage["speakingPeoples"][number]
): number {
  return (
    left.name.localeCompare(right.name, "fr") ||
    left.id.localeCompare(right.id, "en")
  );
}

// @req REQ-136
export function serializeLanguage(language: LanguageAggregate): PublicLanguage {
  return {
    id: language.id,
    name: language.name,
    nameProvenance: language.nameProvenance,
    family: {
      id: language.family.id,
      name: language.family.name,
    },
    speakingPeoples: language.speakingPeoples
      .map((people) => ({ id: people.id, name: people.name }))
      .sort(comparePeopleByName),
    vehicularRole: language.vehicularRole,
    vitalityStatus: language.vitalityStatus
      ? {
          status: language.vitalityStatus.status,
          scale: language.vitalityStatus.scale,
          asOf: language.vitalityStatus.asOf,
        }
      : null,
    sources: language.sources.map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url,
      tier: source.tier,
      ...(source.notes !== undefined ? { notes: source.notes } : {}),
    })),
  };
}
