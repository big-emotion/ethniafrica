"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { PageLayout } from "@/components/layout/PageLayout";
import { ActionLink } from "@/components/ui/ActionLink";
import { useLanguage } from "@/hooks/use-language";
import { ATTRIBUTION_STRING } from "@/lib/brand";
import { getLocalizedRoute } from "@/lib/routing";
import { Language } from "@/types/shared";

/**
 * Where a reader who chose "Signaler une erreur" is told to go.
 *
 * This page used to host a Typeform embed and four paragraphs pointing at "le
 * formulaire ci-dessous". The site's CSP allows scripts from `'self'` and a
 * per-request nonce, so the embed's script was never executed: no iframe, no
 * form, no console the reader would ever see — a promise over blank paper.
 * The atlas had meanwhile built its own report path, which the page never
 * learned about.
 *
 * It does not simply grow a form of its own, and that is a charter decision
 * rather than a shortcut. The moderation charter opens §2 on "a reader on a
 * fiche", and §3 refuses a control detached from the reading because it moves
 * the "which part?" question from the page back onto the reader. A general
 * form here would also file its flags under a target the public register has
 * no column for. So the page hands the reader the two things it can honestly
 * give: where the control is, and what became of the reports already made.
 */
// @req REQ-014
export default function ReportErrorPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  // Sync language from URL param
  useEffect(() => {
    if (lang && ["fr"].includes(lang) && lang !== language) {
      setLanguage(lang as Language);
    }
  }, [lang, language, setLanguage]);

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      hideHeader={true}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-afh-h1 font-display font-bold">
          Signalez une erreur
        </h1>

        <section className="space-y-4">
          <h2 className="text-afh-h2 font-display font-bold">
            Contribuez à l&apos;exactitude des données
          </h2>
          <p>
            Les informations présentées sur ce site proviennent de différentes
            sources, publiques ou collaboratives. Bien que nous fassions de
            notre mieux pour vérifier et consolider ces données, certaines
            peuvent être incomplètes, approximatives ou contenir des erreurs.
          </p>
          <p>
            Chaque retour nous permet d&apos;améliorer la qualité et la
            fiabilité de l&apos;atlas, au bénéfice de toute la communauté.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-afh-h2 font-display font-bold">
            Où signaler une erreur
          </h2>
          <p>
            Un signalement se fait depuis la page où se trouve l&apos;erreur,
            jamais depuis un formulaire général : c&apos;est ce qui nous permet
            de savoir quelle affirmation vous contestez, sans avoir à vous le
            demander.
          </p>
          <p>
            Ouvrez la fiche concernée — un peuple, un pays, une famille
            linguistique — et utilisez le bouton <strong>Signaler</strong> de la
            barre de lecture, qui vous suit tout au long de la fiche et vise le
            chapitre que vous êtes en train de lire. Aucun compte n&apos;est
            nécessaire : ouvrir, écrire, envoyer.
          </p>
          <p>
            <ActionLink href={getLocalizedRoute(language, "explorerHub")}>
              Ouvrir l&apos;atlas
            </ActionLink>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-afh-h2 font-display font-bold">
            Ce que deviennent les signalements
          </h2>
          <p>
            Tous les signalements sont publics, du dépôt à la décision. Vous
            pouvez consulter ceux qui sont en cours d&apos;examen et ceux qui
            ont été tranchés, ainsi que le motif retenu à chaque fois.
          </p>
          <p>
            <ActionLink href={`/${language}/signalements`}>
              Voir le registre des signalements
            </ActionLink>
          </p>
        </section>

        <p className="text-afh-caption text-afh-text-soft">
          {ATTRIBUTION_STRING}
        </p>
      </div>
    </PageLayout>
  );
}
