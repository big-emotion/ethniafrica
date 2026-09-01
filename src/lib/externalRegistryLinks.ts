import type { ExternalIdentifiersSection } from "@/types/afrik";

export interface ExternalRegistryLink {
  label: string;
  url: string;
}

/**
 * Turns the stored bare identifiers (DEC-033) into outbound registry URLs at
 * render time. The URL is never persisted — only the identifier is — so a
 * registry can change its URL scheme without a corpus migration.
 */
// @req REQ-128
export function buildExternalRegistryLinks(
  identifiers?: ExternalIdentifiersSection | null
): ExternalRegistryLink[] {
  if (!identifiers) return [];

  const links: ExternalRegistryLink[] = [];

  if (identifiers.wikidataId) {
    links.push({
      label: "Wikidata",
      url: `https://www.wikidata.org/wiki/${identifiers.wikidataId}`,
    });
  }

  if (identifiers.glottocode) {
    links.push({
      label: "Glottolog",
      url: `https://glottolog.org/resource/languoid/id/${identifiers.glottocode}`,
    });
  }

  if (identifiers.iso639_3) {
    links.push({
      label: "ISO 639-3",
      url: `https://iso639-3.sil.org/code/${identifiers.iso639_3}`,
    });
  }

  return links;
}
