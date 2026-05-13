"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { Language } from "@/types/shared";
import { classificationLabels } from "@/lib/translations";

/**
 * /fr/doctrine — Editorial doctrine page for the classification_status enum.
 *
 * Each H2 here exposes an anchor (id="<status>") that ClassificationBadge
 * links to. Story ETNI-178 / 0.21 (AR21, AR44).
 *
 * Anchors:
 *   - #consensual
 *   - #contested
 *   - #colonial-legacy
 *   - #reconstructive
 */
export default function DoctrinePage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    if (lang && ["fr"].includes(lang) && lang !== language) {
      setLanguage(lang as Language);
    }
  }, [lang, language, setLanguage]);

  const sections: Array<{
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

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      title="Doctrine éditoriale"
      sectionName="Doctrine éditoriale"
    >
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Doctrine éditoriale</h1>
          <p className="text-muted-foreground">
            Cette page définit le statut épistémique attribué à chaque
            classification de peuple et de famille linguistique. Le badge
            affiché sur les fiches renvoie vers la définition correspondante
            ci-dessous.
          </p>
        </header>

        {sections.map((section) => {
          const labels = classificationLabels[section.id];
          return (
            <section
              key={section.id}
              id={section.id}
              className="space-y-2 scroll-mt-24"
            >
              <h2 className="text-2xl font-semibold">{labels.label}</h2>
              <p className="text-sm italic text-muted-foreground">
                {labels.tooltip}
              </p>
              <p className="leading-relaxed">{section.description}</p>
            </section>
          );
        })}
      </div>
    </PageLayout>
  );
}
