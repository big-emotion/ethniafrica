"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { useEffect } from "react";
import { Language } from "@/types/shared";
import Script from "next/script";

export default function ReportErrorPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  // Sync language from URL param
  useEffect(() => {
    if (lang && ["en", "fr"].includes(lang) && lang !== language) {
      setLanguage(lang as Language);
    }
  }, [lang, language, setLanguage]);

  const content = {
    en: {
      title: "Report an Error",
      intro: {
        title: "Contribute to Data Accuracy",
        text1: (
          <>
            The information displayed on this website comes from various public
            or collaborative sources. While we do our best to verify and
            consolidate this data, some information may be incomplete,
            approximate, or contain errors.
          </>
        ),
        text2: (
          <>
            Your contribution is valuable: if you notice incorrect, missing, or
            doubtful information, you can report it using the form below.
          </>
        ),
        text3: (
          <>
            Every submission helps us improve the quality and reliability of the
            atlas for the benefit of the entire community.
          </>
        ),
        text4: (
          <>
            Thank you for helping us build a more accurate and trustworthy
            database.
          </>
        ),
      },
      footer: "Made with emotion for Africa",
    },
    fr: {
      title: "Signalez une erreur",
      intro: {
        title: "Contribuez à l'exactitude des données",
        text1: (
          <>
            Les informations présentées sur ce site proviennent de différentes
            sources, publiques ou collaboratives. Bien que nous fassions de
            notre mieux pour vérifier et consolider ces données, certaines
            peuvent être incomplètes, approximatives ou contenir des erreurs.
          </>
        ),
        text2: (
          <>
            Votre contribution est précieuse : si vous remarquez une information
            incorrecte, manquante ou douteuse, vous pouvez nous la signaler
            grâce au formulaire ci-dessous.
          </>
        ),
        text3: (
          <>
            Chaque retour nous permet d&apos;améliorer la qualité et la
            fiabilité de l&apos;atlas, au bénéfice de toute la communauté.
          </>
        ),
        text4: (
          <>
            Merci pour votre aide dans la construction d&apos;une base de
            données plus juste et plus fidèle.
          </>
        ),
      },
      footer: "Fait avec émotion pour l'Afrique",
    },
  };

  const t = content[language];

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      hideHeader={true}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-display font-bold">{t.title}</h1>

        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">{t.intro.title}</h2>
          <p>{t.intro.text1}</p>
          <p>{t.intro.text2}</p>
          <p>{t.intro.text3}</p>
          <p>{t.intro.text4}</p>
        </section>

        <section className="space-y-4">
          <div className="w-full">
            <div data-tf-live="01K9YGAYPS6E4FH0WBRH0N0TPM" />
          </div>
          <Script
            src="//embed.typeform.com/next/embed.js"
            strategy="afterInteractive"
          />
        </section>
      </div>
    </PageLayout>
  );
}
