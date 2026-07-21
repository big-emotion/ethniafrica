"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { useEffect } from "react";
import { Language } from "@/types/shared";

export default function PrivacyPolicyPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  // Sync language from URL param
  useEffect(() => {
    if (lang && ["fr"].includes(lang) && lang !== language) {
      setLanguage(lang as Language);
    }
  }, [lang, language, setLanguage]);

  const content = {
    fr: {
      title: "Politique de confidentialité",
      lastUpdated: "Dernière mise à jour : Janvier 2025",
      intro:
        "Cette politique de confidentialité décrit comment le Dictionnaire des Ethnies d'Afrique collecte, utilise et protège vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).",

      responsable: {
        title: "1. Responsable du traitement",
        text: "Le Dictionnaire des Ethnies d'Afrique est un projet personnel. Pour toute question relative à vos données personnelles, vous pouvez nous contacter à :",
        email: "contact@ethniafrica.com",
      },

      dataCollected: {
        title: "2. Données collectées",
        intro:
          "Nous collectons uniquement les données strictement nécessaires au fonctionnement du site :",
        essential: {
          title: "Cookies essentiels",
          items: [
            "Préférence de langue (localStorage)",
            "Préférences de consentement (localStorage)",
          ],
        },
        analytics: {
          title: "Analytics (avec consentement)",
          items: [
            "Pages visitées via Plausible Analytics",
            "Plausible est une solution respectueuse de la vie privée, sans cookies, qui ne collecte aucune donnée personnelle",
          ],
        },
        errorReporting: {
          title: "Rapport d'erreurs (avec consentement)",
          items: [
            "Contexte des erreurs techniques via Sentry",
            "Ces données permettent d'améliorer la stabilité du site",
          ],
        },
      },

      processors: {
        title: "3. Sous-traitants (processeurs de données)",
        intro:
          "Nous utilisons les services suivants pour le fonctionnement du site :",
        items: [
          {
            name: "Plausible Analytics",
            purpose: "Analytics respectueux de la vie privée",
            description:
              "Solution européenne sans cookies, conforme RGPD par conception. Aucune donnée personnelle collectée.",
            location: "Union Européenne",
          },
          {
            name: "Sentry",
            purpose: "Suivi des erreurs techniques",
            description:
              "Collecte le contexte des erreurs pour améliorer la stabilité. Activé uniquement avec votre consentement.",
            location: "États-Unis (clauses contractuelles types)",
          },
          {
            name: "Supabase",
            purpose: "Hébergement de la base de données",
            description:
              "Stockage des données du dictionnaire (ethnies, pays). Aucune donnée utilisateur stockée.",
            location: "Union Européenne",
          },
          {
            name: "Vercel",
            purpose: "Hébergement du site web",
            description:
              "Hébergement et diffusion du contenu. Logs serveur standard.",
            location: "Mondial (clauses contractuelles types)",
          },
        ],
        residencyNote:
          "Le détail technique de la résidence des données (régions, méthodes de vérification, attestation datée) est documenté dans le dépôt :",
        residencyLinkLabel: "docs/infra-data-residency.md",
        residencyLinkUrl:
          "https://github.com/big-emotion/ethniafrica/blob/main/docs/infra-data-residency.md",
      },

      retention: {
        title: "4. Durée de conservation des données",
        items: [
          {
            type: "Préférences de consentement",
            duration: "12 mois",
            storage: "localStorage de votre navigateur",
          },
          {
            type: "Données analytics",
            duration: "Agrégées uniquement",
            storage: "Aucune donnée personnelle conservée",
          },
          {
            type: "Logs d'erreurs",
            duration: "90 jours",
            storage: "Supprimés automatiquement après cette période",
          },
        ],
      },

      lawfulBasis: {
        title: "5. Base légale des traitements",
        intro:
          "Conformément à l'article 6 du RGPD, chaque traitement repose sur une base légale spécifique :",
        items: [
          {
            treatment: "Cookies essentiels (langue, session)",
            basis: "Intérêt légitime",
            justification:
              "Nécessaires au fonctionnement technique du site et à l'expérience utilisateur",
          },
          {
            treatment: "Analytics (Plausible)",
            basis: "Consentement",
            justification:
              "Activé uniquement après acceptation explicite via la bannière de consentement",
          },
          {
            treatment: "Rapport d'erreurs (Sentry)",
            basis: "Consentement",
            justification:
              "Activé uniquement après acceptation explicite via la bannière de consentement",
          },
        ],
      },

      rights: {
        title: "6. Vos droits (Articles 15-22 du RGPD)",
        intro:
          "Conformément au RGPD, vous disposez des droits suivants concernant vos données personnelles :",
        items: [
          {
            right: "Droit d'accès (Article 15)",
            description:
              "Vous pouvez demander une copie de toutes les données personnelles que nous détenons vous concernant.",
          },
          {
            right: "Droit de rectification (Article 16)",
            description:
              "Vous pouvez demander la correction de données inexactes ou incomplètes.",
          },
          {
            right: "Droit à l'effacement (Article 17)",
            description:
              "Vous pouvez demander la suppression de vos données personnelles (« droit à l'oubli »).",
          },
          {
            right: "Droit à la limitation du traitement (Article 18)",
            description:
              "Vous pouvez demander la restriction du traitement de vos données dans certaines circonstances.",
          },
          {
            right: "Droit à la portabilité (Article 20)",
            description:
              "Vous pouvez demander à recevoir vos données dans un format structuré et lisible par machine.",
          },
          {
            right: "Droit d'opposition (Article 21)",
            description:
              "Vous pouvez vous opposer au traitement de vos données pour des raisons tenant à votre situation particulière.",
          },
        ],
        exercise:
          "Pour exercer l'un de ces droits, contactez-nous par email. Nous répondrons dans un délai d'un mois.",
        complaint:
          "Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés).",
        cnilUrl: "https://www.cnil.fr/",
      },

      consent: {
        title: "7. Gestion de votre consentement",
        text: "Vous pouvez à tout moment modifier vos préférences de consentement en cliquant sur le bouton « Paramètres des cookies » situé en bas de chaque page. Vos choix sont sauvegardés localement dans votre navigateur.",
      },

      security: {
        title: "8. Sécurité des données",
        text: "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou destruction. Le site utilise le protocole HTTPS pour chiffrer toutes les communications.",
      },

      changes: {
        title: "9. Modifications de cette politique",
        text: "Nous pouvons mettre à jour cette politique de confidentialité. En cas de modification substantielle, la date de mise à jour sera actualisée en haut de cette page.",
      },

      contact: {
        title: "10. Contact",
        text: "Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, contactez-nous à :",
        email: "contact@ethniafrica.com",
      },
    },
  };

  const t = content[language as keyof typeof content];

  // Guard against an undefined translation (e.g. unsupported language on first
  // render before the useEffect sync fires).
  if (!t) return null;

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      hideHeader={true}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{t.title}</h1>
          <p className="text-muted-foreground mt-2">{t.lastUpdated}</p>
        </div>

        <p className="text-lg">{t.intro}</p>

        {/* 1. Responsable du traitement */}
        <section className="space-y-3">
          <h2 className="text-2xl font-display font-bold">
            {t.responsable.title}
          </h2>
          <p>{t.responsable.text}</p>
          <p>
            <a
              href={`mailto:${t.responsable.email}`}
              className="underline underline-offset-4 hover:text-primary"
            >
              {t.responsable.email}
            </a>
          </p>
        </section>

        {/* 2. Données collectées */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">
            {t.dataCollected.title}
          </h2>
          <p>{t.dataCollected.intro}</p>

          <div className="space-y-4 ml-4">
            <div>
              <h3 className="text-lg font-semibold">
                {t.dataCollected.essential.title}
              </h3>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                {t.dataCollected.essential.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold">
                {t.dataCollected.analytics.title}
              </h3>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                {t.dataCollected.analytics.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold">
                {t.dataCollected.errorReporting.title}
              </h3>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                {t.dataCollected.errorReporting.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Sous-traitants */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">
            {t.processors.title}
          </h2>
          <p>{t.processors.intro}</p>

          <div className="space-y-4">
            {t.processors.items.map((processor, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                <h3 className="font-semibold text-lg">{processor.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {processor.purpose}
                </p>
                <p className="mt-2">{processor.description}</p>
                <p className="text-sm mt-2">
                  <span className="font-medium">Localisation :</span>{" "}
                  {processor.location}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {t.processors.residencyNote}{" "}
            <a
              href={t.processors.residencyLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-primary"
            >
              {t.processors.residencyLinkLabel}
            </a>
            .
          </p>
        </section>

        {/* 4. Durée de conservation */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">
            {t.retention.title}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">
                    Type de données
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">Durée</th>
                  <th className="text-left py-3 px-4 font-semibold">
                    Stockage
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.retention.items.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-3 px-4">{item.type}</td>
                    <td className="py-3 px-4">{item.duration}</td>
                    <td className="py-3 px-4">{item.storage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Base légale */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">
            {t.lawfulBasis.title}
          </h2>
          <p>{t.lawfulBasis.intro}</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">
                    Traitement
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">
                    Base légale
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">
                    Justification
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.lawfulBasis.items.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-3 px-4">{item.treatment}</td>
                    <td className="py-3 px-4 font-medium">{item.basis}</td>
                    <td className="py-3 px-4">{item.justification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. Vos droits */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">{t.rights.title}</h2>
          <p>{t.rights.intro}</p>

          <div className="space-y-3">
            {t.rights.items.map((item, idx) => (
              <div key={idx} className="border-l-4 border-primary pl-4 py-2">
                <h3 className="font-semibold">{item.right}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p>{t.rights.exercise}</p>
            <p>
              {t.rights.complaint}{" "}
              <a
                href={t.rights.cnilUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-primary"
              >
                www.cnil.fr
              </a>
            </p>
          </div>
        </section>

        {/* 7. Gestion du consentement */}
        <section className="space-y-3">
          <h2 className="text-2xl font-display font-bold">{t.consent.title}</h2>
          <p>{t.consent.text}</p>
        </section>

        {/* 8. Sécurité */}
        <section className="space-y-3">
          <h2 className="text-2xl font-display font-bold">
            {t.security.title}
          </h2>
          <p>{t.security.text}</p>
        </section>

        {/* 9. Modifications */}
        <section className="space-y-3">
          <h2 className="text-2xl font-display font-bold">{t.changes.title}</h2>
          <p>{t.changes.text}</p>
        </section>

        {/* 10. Contact */}
        <section className="space-y-3">
          <h2 className="text-2xl font-display font-bold">{t.contact.title}</h2>
          <p>{t.contact.text}</p>
          <p>
            <a
              href={`mailto:${t.contact.email}`}
              className="underline underline-offset-4 hover:text-primary"
            >
              {t.contact.email}
            </a>
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
