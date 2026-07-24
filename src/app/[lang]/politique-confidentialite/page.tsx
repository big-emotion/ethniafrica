"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { useEffect } from "react";
import { Language } from "@/types/shared";

export default function PrivacyPolicyMineurPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

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
      <div className="max-w-4xl mx-auto space-y-8 py-12 px-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            Politique de confidentialité
          </h1>
          <p className="text-muted-foreground mt-2">
            Dernière mise à jour : Juin 2026
          </p>
        </div>

        <p className="text-lg">
          Cette politique décrit comment EthniAfrica traite vos données
          personnelles dans le respect du RGPD (UE 2016/679) et des lois
          applicables en matière de protection des mineurs.
        </p>

        {/* MINEURS — anchor target for registration form link */}
        <section id="mineurs" className="space-y-4 scroll-mt-20">
          <h2 className="text-2xl font-display font-bold">
            Protection des mineurs (COPPA / RGPD Article 8)
          </h2>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Âge minimum requis</h3>
            <p>
              L&apos;accès aux fonctionnalités de contribution (signalements,
              corrections) est réservé aux personnes âgées d&apos;au moins{" "}
              <strong>16 ans</strong>. Les personnes âgées de{" "}
              <strong>13 à 15 ans</strong> peuvent participer uniquement avec le
              consentement explicite et vérifiable d&apos;un parent ou
              représentant légal, conformément à la législation de leur pays de
              résidence.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Données collectées lors de l&apos;inscription
            </h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>
                Adresse e-mail (pour l&apos;authentification par lien magique ou
                OAuth)
              </li>
              <li>
                Date et heure de confirmation d&apos;âge (
                <code>age_confirmed_at</code>) — enregistrée une seule fois lors
                de la première inscription
              </li>
              <li>
                Nom d&apos;affichage dérivé du profil OAuth ou du préfixe e-mail
                (jamais de nom légal complet)
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Absence de publicité ciblée
            </h3>
            <p>
              EthniAfrica ne pratique{" "}
              <strong>aucun traçage publicitaire</strong>. L&apos;analyse
              d&apos;audience est assurée exclusivement par{" "}
              <strong>Plausible Analytics</strong>, une solution européenne{" "}
              <em>sans cookies</em> qui ne collecte aucune donnée personnelle et
              ne crée aucun profil d&apos;utilisateur.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Durées de conservation</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>
                Profil contributeur (email, nom d&apos;affichage,
                age_confirmed_at) : conservé tant que le compte est actif, puis
                supprimé dans les 30 jours suivant la demande de clôture.
              </li>
              <li>
                Signalements soumis : conservés indéfiniment dans le journal
                d&apos;audit public (base légale : intérêt légitime à la
                transparence éditoriale), sauf demande d&apos;anonymisation.
              </li>
              <li>Logs techniques (Sentry) : 90 jours.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Droit à l&apos;effacement</h3>
            <p>
              Conformément à l&apos;article 17 du RGPD, vous pouvez demander la
              suppression de votre profil et de vos données personnelles à tout
              moment en écrivant à{" "}
              <a
                href="mailto:contact@ethniafrica.com"
                className="underline underline-offset-4 hover:text-primary"
              >
                contact@ethniafrica.com
              </a>
              . Les signalements liés à votre compte seront anonymisés (le champ{" "}
              <code>contributor_id</code> sera mis à NULL) dans les 30 jours.
            </p>
            <p>
              Pour les mineurs, ce droit peut être exercé par le parent ou
              représentant légal sans condition.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-display font-bold">Contact</h2>
          <p>
            Pour toute question relative à cette politique ou pour exercer vos
            droits :
          </p>
          <p>
            <a
              href="mailto:contact@ethniafrica.com"
              className="underline underline-offset-4 hover:text-primary"
            >
              contact@ethniafrica.com
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            Pour la politique complète incluant les sous-traitants, bases
            légales et gestion du consentement analytique, consultez notre{" "}
            <a
              href={`/${lang}/confidentialite`}
              className="underline underline-offset-4 hover:text-primary"
            >
              politique de confidentialité complète
            </a>
            .
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
