"use client";

import { FlagForm } from "@/components/flags/FlagForm";
import { ProofOfWorkGate } from "@/components/flags/ProofOfWorkGate";
import { submitFlag } from "@/components/flags/submitFlag";
import { PageLayout } from "@/components/layout/PageLayout";
import { ActionLink } from "@/components/ui/ActionLink";
import { useLanguage } from "@/hooks/use-language";
import { ATTRIBUTION_STRING } from "@/lib/brand";
import { getLocalizedRoute, getStaticPageRoute } from "@/lib/routing";

/**
 * The general report form — the footer's "Signaler une erreur".
 *
 * This page used to host a Typeform embed and four paragraphs pointing at "le
 * formulaire ci-dessous". The site's CSP allows scripts from `'self'` and a
 * per-request nonce, so the embed's script was never executed: no iframe, no
 * form, no console message the reader would ever see — a promise over blank
 * paper. The atlas had meanwhile built its own report path, which this page
 * never learned about.
 *
 * It now carries that path's own form, filed against a `general` target.
 *
 * That is a **deliberate exception** to the moderation charter §3, which
 * prefers a control anchored to what is being read and warns that a
 * context-free one hands the "which part?" question back to the reader. The
 * warning is right, and the aimed control now exists on every fiche's reading
 * rail. But the footer offers this page on every screen of the site, including
 * to a reader who cannot name the fiche concerned — someone reporting a broken
 * page, a wrong translation, or something they saw and did not bookmark. An
 * entry point that leads nowhere is worse than one that lands imprecisely, and
 * `general` is a real column in the public register rather than an
 * `assertion` the report does not actually contest.
 *
 * The form is on the page rather than behind a button: a reader who has
 * already chosen "Signaler une erreur" has stated their intent, and a second
 * control before the field is the toll §2 exists to remove.
 */

/**
 * A report that names no entity still needs an address, because `target_id` is
 * required end to end. `site` is that address, and it is honest: what is being
 * reported is the atlas, not a row in it.
 */
const GENERAL_TARGET = {
  type: "general",
  id: "site",
} as const;

// @req REQ-014
export default function ReportErrorPage() {
  // The route's locale, read by the hook itself; nothing here writes it back,
  // because only the switcher may remember a choice (REQ-140).
  const { language, setLanguage } = useLanguage();

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
            Décrivez ci-dessous ce qui ne va pas. Aucun compte n&apos;est
            nécessaire, et la correction proposée comme la source sont
            facultatives : nous préférons un signalement incomplet à un
            signalement que vous renoncez à écrire.
          </p>
          <p>
            Si l&apos;erreur se trouve sur une fiche précise, le bouton{" "}
            <strong>Signaler</strong> de la barre de lecture de cette fiche vise
            directement le chapitre concerné — c&apos;est plus rapide pour vous
            et plus précis pour la modération.{" "}
            <ActionLink href={getLocalizedRoute(language, "peoples")}>
              Ouvrir l&apos;atlas des peuples
            </ActionLink>
          </p>
        </section>

        <FlagForm
          target={GENERAL_TARGET}
          onSubmit={submitFlag}
          renderVerification={({ onSolved, onFailed }) => (
            <ProofOfWorkGate onSolved={onSolved} onFailed={onFailed} />
          )}
        />

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
            <ActionLink href={getStaticPageRoute(language, "reports")}>
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
