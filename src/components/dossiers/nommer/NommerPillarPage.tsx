import { ChapterTileGrid } from "@/components/dossiers/nommer/ChapterTileGrid";
import { ThesisMeasures } from "@/components/dossiers/nommer/ThesisMeasures";
import { PageLayout } from "@/components/layout/PageLayout";
import { ChapterHeading } from "@/components/pages/ChapterHeading";
import { ActionLink } from "@/components/ui/ActionLink";
import { getLocalizedNommerChapters } from "@/lib/dossiers/nommer/localizeChapter";
import { NOMMER_FIGURES } from "@/lib/dossiers/nommer/figures";
import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";
import { nommerCopy } from "@/lib/i18n/copy/nommer";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

const countedValue = (figureKey: string): number => {
  const figure = NOMMER_FIGURES[figureKey];
  return figure && figure.kind === "counted" ? figure.value : 0;
};

/**
 * Six terms as chips, one per doorway rather than one per family: they are an
 * invitation, and a reader who wanted the whole list would take the link
 * beneath them. Chosen for being the words this dossier cannot be read
 * without, not for covering the three families evenly.
 */
const GLOSSARY_DOORWAY_IDS = [
  "endonyme",
  "exonyme",
  "ethnonyme",
  "glossonyme",
  "reification-ethnique",
  "tribu",
];

const GLOSSARY_DOORWAY_TERMS = GLOSSARY_DOORWAY_IDS.map((id) =>
  GLOSSARY_ENTRIES.find((entry) => entry.id === id)
).filter(Boolean);

/**
 * The pillar of « Qui a donné ce nom ? ».
 *
 * Six bands, none of them more than four consecutive lines of prose, because
 * the surface this dossier replaces is a wall of text and the brief was
 * explicit about that. The reading happens in the chapters; the pillar states
 * the claim and hands over.
 *
 * One `.afh-accent-teal` wrapper, set once at page level (brand charter §5.2).
 * Teal is the accent of the Dossiers axis, and no block below picks its own.
 *
 * No band measures itself against the viewport (§8.2): every height here is
 * content plus padding. `.afh-hero` already holds that line for the plate.
 */
// @req REQ-113
export const NommerPillarPage = ({ language }: { language: Language }) => {
  const glossaryHref = getLocalizedRoute(language, "glossary");
  const copy = nommerCopy[language];
  const chapters = getLocalizedNommerChapters(language);

  return (
    <PageLayout language={language} title={copy.title} subtitle={copy.subtitle}>
      <div className="afh-accent-teal flex flex-col gap-afh-6xl">
        <section aria-labelledby="nommer-these">
          <ChapterHeading
            stepLabel={copy.thesisStep}
            heading={copy.thesisHeading}
            id="nommer-these"
          />
          <ThesisMeasures language={language} />
        </section>

        <section aria-labelledby="nommer-chapitres">
          <ChapterHeading
            stepLabel={copy.dossierStep}
            heading={copy.dossierHeading}
            id="nommer-chapitres"
          />
          <p className="mb-afh-lg mt-afh-md text-afh-body text-afh-text-soft">
            {copy.dossierIntro}
          </p>
          <ChapterTileGrid language={language} chapters={chapters} />
        </section>

        <section aria-labelledby="nommer-limites">
          <ChapterHeading
            stepLabel={copy.limitsStep}
            heading={copy.limitsHeading}
            id="nommer-limites"
          />
          <div className="mt-afh-md flex flex-col gap-afh-md text-afh-body text-afh-text-soft">
            <p>
              {copy.undeclared(
                countedValue("status-undeclared"),
                countedValue("corpus-peoples")
              )}
            </p>
            <p>{copy.missingImposition}</p>
            <p>{copy.countryEtymologies}</p>
            <ActionLink href={getLocalizedRoute(language, "doctrine")}>
              {copy.doctrineAction}
            </ActionLink>
          </div>
        </section>

        <section aria-labelledby="nommer-glossaire">
          <ChapterHeading
            stepLabel={copy.vocabularyStep}
            heading={copy.vocabularyHeading(GLOSSARY_ENTRIES.length)}
            id="nommer-glossaire"
          />
          <p className="mb-afh-lg mt-afh-md text-afh-body text-afh-text-soft">
            {copy.vocabularyIntro}
          </p>
          <ul className="mb-afh-lg flex list-none flex-wrap gap-afh-sm p-0">
            {GLOSSARY_DOORWAY_TERMS.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`${glossaryHref}#terme-${entry.id}`}
                  className="inline-flex min-h-11 items-center rounded-afh-full border border-afh-border px-afh-md text-afh-small font-semibold text-[color:var(--accent-ink)] no-underline hover:underline focus-visible:underline focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]"
                >
                  {language === "en" ? entry.en : entry.fr}
                </a>
              </li>
            ))}
          </ul>
          <ActionLink href={glossaryHref}>
            {copy.glossaryAction(GLOSSARY_ENTRIES.length)}
          </ActionLink>
        </section>
      </div>
    </PageLayout>
  );
};
