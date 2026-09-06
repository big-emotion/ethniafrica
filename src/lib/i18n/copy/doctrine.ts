import type { ClassificationStatus } from "@/types/afrik";
import type { Language } from "@/types/shared";

const en = {
  title: "Editorial doctrine",
  intro:
    "This page defines the epistemic status assigned to each classification of a people or language family. The badge shown on each fiche links to the corresponding definition below.",
  stepLabel: "Editorial status",
  descriptions: {
    consensual:
      "A classification is consensual when it has broad support in contemporary scholarship, including historical linguistics, anthropology and archaeology. Primary and secondary sources converge, and academic debate over the classification is closed or marginal.",
    contested:
      "A classification is contested when scholars actively debate its internal subdivisions, its boundaries with a neighbouring family, or documented competing hypotheses. We retain the current classification while making the controversy visible.",
    "colonial-legacy":
      "A colonial-legacy classification is a category created or fixed during the colonial period, usually by administrators, missionaries or linguists working for the administration. We retain these categories for historical traceability, explain why they are problematic, and favour self-designations.",
    reconstructive:
      "A reconstructive classification is established from fragmentary evidence, such as oral traditions, archaeology, genetics or glottochronology. It remains provisional, is revised as new evidence emerges, and is explicitly presented as a reconstruction.",
  } satisfies Record<ClassificationStatus, string>,
};

type DoctrineCopy = typeof en;

const fr: DoctrineCopy = {
  title: "Doctrine éditoriale",
  intro:
    "Cette page définit le statut épistémique attribué à chaque classification de peuple et de famille linguistique. Le badge affiché sur les fiches renvoie vers la définition correspondante ci-dessous.",
  stepLabel: "Statut éditorial",
  descriptions: {
    consensual:
      "Une classification est dite consensuelle lorsqu'elle fait l'objet d'un large accord dans la littérature scientifique contemporaine (linguistique historique, anthropologie, archéologie). Les sources primaires et secondaires convergent et le débat académique sur le rattachement est clos ou marginal.",
    contested:
      "Une classification est contestée lorsqu'elle fait l'objet de débats actifs entre chercheurs : sous-classification interne discutée, frontières floues avec une famille voisine, hypothèses concurrentes documentées. Nous conservons la classification courante tout en signalant la controverse.",
    "colonial-legacy":
      "Une classification d'héritage colonial est une catégorie produite (ou figée) durant la période coloniale, généralement par des administrateurs, des missionnaires ou des linguistes au service de l'administration. Nous conservons ces catégories pour respecter la traçabilité historique, mais nous expliquons pourquoi elles sont problématiques et privilégions les auto-appellations.",
    reconstructive:
      "Une classification reconstructive est une catégorisation établie à partir de sources fragmentaires (traditions orales, archéologie, génétique, glottochronologie). Elle reste provisoire, sujette à révision à mesure que de nouvelles données émergent, et explicitement présentée comme une reconstruction.",
  },
};

// @req REQ-141
export const doctrineCopy: Record<Language, DoctrineCopy> = { en, fr };
