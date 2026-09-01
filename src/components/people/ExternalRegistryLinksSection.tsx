import { chapterAnchorId } from "@/lib/ficheChapters";
import { buildExternalRegistryLinks } from "@/lib/externalRegistryLinks";
import type { ExternalIdentifiersSection } from "@/types/afrik";

/** The chapter this section is, in the fiche's reading rail. */
const CHAPTER_TITLE = "Identifiants externes";

export interface ExternalRegistryLinksSectionProps {
  identifiers?: ExternalIdentifiersSection | null;
}

/**
 * Outbound links to the registries a people's stored identifiers resolve
 * into (DEC-033). Not a rubric of the fiche model — the corpus is never
 * asked to fill it — so, like the globe's grammar section or colonial
 * fragmentation, it stays conditional with no `FieldProvenanceMarker`: no
 * identifier means nothing to link to, not a corpus silence.
 */
// @req REQ-128
export function ExternalRegistryLinksSection({
  identifiers,
}: ExternalRegistryLinksSectionProps) {
  const links = buildExternalRegistryLinks(identifiers);

  if (links.length === 0) return null;

  return (
    <section
      id={chapterAnchorId(CHAPTER_TITLE)}
      data-fiche-section={CHAPTER_TITLE}
      aria-labelledby="external-registry-links-title"
      className="people-fade-in space-y-3 overflow-hidden rounded-[var(--country-radius-xl)] p-[18px] md:rounded-[20px] md:p-6 xl:rounded-[22px] xl:p-7"
      style={{
        background: "var(--country-card)",
        border: "1px solid var(--country-border)",
      }}
    >
      <div>
        <h2
          id="external-registry-links-title"
          className="text-afh-small font-bold text-[var(--country-text)]"
        >
          {CHAPTER_TITLE}
        </h2>
        <p className="mt-1 text-afh-small text-[var(--country-text-soft)]">
          Les fiches correspondantes dans les registres externes référencés par
          cette fiche.
        </p>
      </div>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-afh-small text-[var(--country-text)] underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
