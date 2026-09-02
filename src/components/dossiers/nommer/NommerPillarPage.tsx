import { ChapterTileGrid } from "@/components/dossiers/nommer/ChapterTileGrid";
import { ThesisMeasures } from "@/components/dossiers/nommer/ThesisMeasures";
import { PageLayout } from "@/components/layout/PageLayout";
import { ChapterHeading } from "@/components/pages/ChapterHeading";
import { ActionLink } from "@/components/ui/ActionLink";
import { NOMMER_CHAPTERS } from "@/lib/dossiers/nommer/chapters";
import { NOMMER_FIGURES } from "@/lib/dossiers/nommer/figures";
import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

const LANGUAGE: Language = "fr";

// @req REQ-113
export const NOMMER_PAGE_TITLE = "Qui a donné ce nom ?";
// @req REQ-113
export const NOMMER_PAGE_SUBTITLE =
  "L'atlas nomme huit cents peuples, cinquante-quatre pays et vingt-quatre familles de langues. Presque aucun de ces noms n'a été choisi par ceux qu'il désigne.";

const countedValue = (figureKey: string): number => {
  const figure = NOMMER_FIGURES[figureKey];
  return figure && figure.kind === "counted" ? figure.value : 0;
};

const missingImposition = NOMMER_FIGURES["exonyms-imposed-by-administration"];

const UNDECLARED_SENTENCE = `${countedValue("status-undeclared")} fiches de peuple sur ${countedValue("corpus-peoples")} ne déclarent aucun statut de classification.`;

const MISSING_IMPOSITION_REASON =
  missingImposition.kind === "missing" ? missingImposition.reason : "";

const glossaryHref = getLocalizedRoute(LANGUAGE, "glossary");

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
export const NommerPillarPage = () => (
  <PageLayout
    language={LANGUAGE}
    title={NOMMER_PAGE_TITLE}
    subtitle={NOMMER_PAGE_SUBTITLE}
  >
    <div className="afh-accent-teal flex flex-col gap-afh-6xl">
      <section aria-labelledby="nommer-these">
        <ChapterHeading
          stepLabel="La thèse"
          heading="Trois nombres, avant tout le reste"
          id="nommer-these"
        />
        <ThesisMeasures />
      </section>

      <section aria-labelledby="nommer-chapitres">
        <ChapterHeading
          stepLabel="Le dossier"
          heading="Cinq chapitres, cinq choses qu'on nomme"
          id="nommer-chapitres"
        />
        <p className="mb-afh-lg mt-afh-md text-afh-body text-afh-text-soft">
          Un peuple, un pays, une personne, une langue, une chose. Chaque
          chapitre est un régime de dénomination différent, et le dernier existe
          parce que les quatre premiers laisseraient croire que la question ne
          concerne que les peuples.
        </p>
        <ChapterTileGrid language={LANGUAGE} chapters={NOMMER_CHAPTERS} />
      </section>

      <section aria-labelledby="nommer-limites">
        <ChapterHeading
          stepLabel="Les limites"
          heading="Ce que ce dossier ne peut pas dire"
          id="nommer-limites"
        />
        <div className="mt-afh-md flex flex-col gap-afh-md text-afh-body text-afh-text-soft">
          <p>
            {UNDECLARED_SENTENCE} Elles ne sont pas jugées non problématiques :
            elles n’ont pas été examinées. C’est un chantier ouvert, et le taire
            derrière un pourcentage reviendrait à le compter comme un résultat.
          </p>
          <p>{MISSING_IMPOSITION_REASON}</p>
          <p>
            Les étymologies des cinquante-quatre pays sont renseignées dans le
            corpus et adossées à aucune source : le chapitre « Le pays » les
            présente comme une lecture, jamais comme une mesure.
          </p>
          <ActionLink href={getLocalizedRoute(LANGUAGE, "doctrine")}>
            Lire la doctrine éditoriale
          </ActionLink>
        </div>
      </section>

      <section aria-labelledby="nommer-glossaire">
        <ChapterHeading
          stepLabel="Le vocabulaire"
          heading="Trente mots, définis une fois"
          id="nommer-glossaire"
        />
        <p className="mb-afh-lg mt-afh-md text-afh-body text-afh-text-soft">
          Endonyme, exonyme, glossonyme, réification ethnique : ce dossier
          emploie des mots que le site affichait sans les définir nulle part. Le
          glossaire les tient, chacun avec un exemple pris dans le corpus — ou
          avec la raison pour laquelle le corpus n’en a pas.
        </p>
        <ul className="mb-afh-lg flex list-none flex-wrap gap-afh-sm p-0">
          {GLOSSARY_DOORWAY_TERMS.map((entry) => (
            <li key={entry.id}>
              <a
                href={`${glossaryHref}#terme-${entry.id}`}
                className="inline-flex min-h-11 items-center rounded-afh-full border border-afh-border px-afh-md text-afh-small font-semibold text-[color:var(--accent-ink)] no-underline hover:underline focus-visible:underline focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]"
              >
                {entry.fr}
              </a>
            </li>
          ))}
        </ul>
        <ActionLink href={glossaryHref}>
          {`Ouvrir le glossaire — ${GLOSSARY_ENTRIES.length} termes`}
        </ActionLink>
      </section>
    </div>
  </PageLayout>
);
