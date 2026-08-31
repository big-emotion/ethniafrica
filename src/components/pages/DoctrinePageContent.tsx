import { classificationLabels } from "@/lib/translations";
import { ChapterHeading } from "@/components/pages/ChapterHeading";

/**
 * /[lang]/doctrine content — editorial family (charter §4/§7, FR107).
 *
 * Each section keeps its `id="<status>"` anchor: ClassificationBadge links
 * to it (story ETNI-178 / 0.21, AR21, AR44). Gains chapter anatomy on every
 * classification section. No reading measure: the prose fills the page box it
 * shares with its title.
 *
 * Anchors:
 *   - #consensual
 *   - #contested
 *   - #colonial-legacy
 *   - #reconstructive
 */
const SECTIONS: Array<{
  id: keyof typeof classificationLabels;
  description: string;
}> = [
  {
    id: "consensual",
    description:
      "Une classification est dite consensuelle lorsqu'elle fait l'objet d'un large accord dans la littérature scientifique contemporaine (linguistique historique, anthropologie, archéologie). Les sources primaires et secondaires convergent et le débat académique sur le rattachement est clos ou marginal.",
  },
  {
    id: "contested",
    description:
      "Une classification est contestée lorsqu'elle fait l'objet de débats actifs entre chercheurs : sous-classification interne discutée, frontières floues avec une famille voisine, hypothèses concurrentes documentées. Nous conservons la classification courante tout en signalant la controverse.",
  },
  {
    id: "colonial-legacy",
    description:
      "Une classification d'héritage colonial est une catégorie produite (ou figée) durant la période coloniale, généralement par des administrateurs, des missionnaires ou des linguistes au service de l'administration. Nous conservons ces catégories pour respecter la traçabilité historique, mais nous expliquons pourquoi elles sont problématiques et privilégions les auto-appellations.",
  },
  {
    id: "reconstructive",
    description:
      "Une classification reconstructive est une catégorisation établie à partir de sources fragmentaires (traditions orales, archéologie, génétique, glottochronologie). Elle reste provisoire, sujette à révision à mesure que de nouvelles données émergent, et explicitement présentée comme une reconstruction.",
  },
];

// @req REQ-091
export default function DoctrinePageContent() {
  return (
    <div className="mx-auto space-y-8 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-afh-h1 font-bold">Doctrine éditoriale</h1>
        <p className="text-muted-foreground">
          Cette page définit le statut épistémique attribué à chaque
          classification de peuple et de famille linguistique. Le badge affiché
          sur les fiches renvoie vers la définition correspondante ci-dessous.
        </p>
      </header>

      {SECTIONS.map((section, index) => {
        const labels = classificationLabels[section.id];
        return (
          <section
            key={section.id}
            id={section.id}
            className="space-y-2 scroll-mt-24"
          >
            <ChapterHeading
              stepLabel={`${String(index + 1).padStart(2, "0")} · Statut éditorial`}
              heading={labels.label}
            />
            <p className="text-afh-small italic text-muted-foreground">
              {labels.tooltip}
            </p>
            <p className="leading-relaxed">{section.description}</p>
          </section>
        );
      })}
    </div>
  );
}
