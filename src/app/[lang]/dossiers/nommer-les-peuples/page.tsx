import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";
import { NAMING_DOSSIER_SECTIONS } from "@/lib/dossiers/namingDossier";
import { getLocalizedRoute } from "@/lib/routing";

const PAGE_TITLE = "Nommer les peuples d'Afrique";
const PAGE_SUBTITLE =
  "Pourquoi un peuple porte plusieurs noms, pourquoi « nom de famille » ne décrit pas ce que l'atlas documente, et ce que le corpus refuse de déduire.";

const CANONICAL_PATH = getLocalizedRoute("fr", "naming");

// @req REQ-114
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_SUBTITLE,
  alternates: { canonical: CANONICAL_PATH },
};

/**
 * The dossier the two naming axes needed and neither could hold.
 *
 * Appellations and Nom index what the corpus records; an index has no room to
 * say why recording it is contested. Filing that under Les dossiers rather
 * than under L'atlas follows the registry's own rule: the atlas takes a name
 * and returns a fiche, a dossier takes a question and returns an explanation
 * crossing several fiches.
 *
 * A shell with a starting text. Every claim is a statement about this corpus —
 * a count, a category it publishes, a rule it holds itself to — and each links
 * to the page where the reader can check it. The external sourcing is
 * editorial work with its own tiers, which is why the module stays `draft`.
 */
// @req REQ-114
export default function NamingDossierPage() {
  return (
    <PageLayout language="fr" title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="afh-parchment" id="dossier">
        {NAMING_DOSSIER_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="afh-parchment-section"
            aria-labelledby={`${section.id}-titre`}
          >
            <h2 id={`${section.id}-titre`}>{section.title}</h2>
            <p className="afh-parchment-note">{section.lede}</p>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
            <p>
              <Link href={getLocalizedRoute("fr", section.link.page)}>
                {section.link.label}
              </Link>
            </p>
          </section>
        ))}
      </div>
    </PageLayout>
  );
}
