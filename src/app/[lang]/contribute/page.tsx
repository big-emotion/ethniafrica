"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { useEffect } from "react";
import { Language } from "@/types/shared";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Script from "next/script";
import {
  ExternalLink,
  Download,
  FileText,
  Code,
  MessageSquare,
} from "lucide-react";
import { ContributionForm } from "@/components/ContributionForm";

export default function ContributePage() {
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
      title: "Contribuer",
      intro: {
        title: "Contribution et participation",
        text1: (
          <>
            Le site est alimenté par une{" "}
            <strong>base de données structurée</strong> regroupant les données
            sur les peuples africains, les familles linguistiques et les pays,
            organisées selon la méthodologie AFRIK.
          </>
        ),
        text2: (
          <>
            Je suis{" "}
            <strong>ouvert à toutes les propositions ou contributions</strong>,
            qu&apos;il s&apos;agisse de partager des sources, des corrections,
            ou simplement des idées d&apos;amélioration. Si vous souhaitez
            aider, n&apos;hésitez pas à me contacter ou à proposer directement
            sur le{" "}
            <a
              href="https://github.com/big-emotion/ethniafrique-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              dépôt GitHub du projet
            </a>
            .
          </>
        ),
      },
      apiDocs: {
        title: "Documentation API",
        text: "Consultez la documentation complète de l'API pour comprendre comment récupérer les données de manière programmatique. L'API fournit des endpoints pour les peuples, familles linguistiques et pays.",
        button: "Voir la documentation API",
      },
      download: {
        title: "Télécharger les données",
        text: "Téléchargez toutes les données au format CSV ou Excel pour votre propre usage, analyse ou contributions.",
        csvButton: "Télécharger CSV (ZIP)",
        excelButton: "Télécharger Excel",
      },
      contact: {
        title: "Contact",
        text: "Vous souhaitez me contacter ou proposer une contribution ? Utilisez le formulaire ci-dessous.",
      },
      github: {
        title: "Contribuer via GitHub",
        text: "Le projet est open source et hébergé sur GitHub. Vous pouvez contribuer en soumettant des issues, des pull requests, ou en améliorant le code source.",
        button: "Participer sur GitHub",
      },
      footer: "Fait avec émotion pour l'Afrique",
    },
  };

  const t = content[language];

  const handleDownload = (format: "csv" | "excel") => {
    window.open(`/api/download?format=${format}`, "_blank");
  };

  return (
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      hideHeader={true}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-display font-bold">{t.title}</h1>

        {/* Section Intro */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">{t.intro.title}</h2>
          <p>{t.intro.text1}</p>
          <p>{t.intro.text2}</p>
        </section>

        {/* Section Contribution Form */}
        <section className="space-y-4">
          <ContributionForm language={language} />
        </section>

        {/* Section API Documentation */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t.apiDocs.title}
          </h3>
          <p className="text-muted-foreground">{t.apiDocs.text}</p>
          <div className="pt-2">
            <Link href="/docs/api" target="_blank" rel="noopener noreferrer">
              <Button variant="default" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t.apiDocs.button}
              </Button>
            </Link>
          </div>
        </section>

        {/* Section Download */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t.download.title}
          </h3>
          <p className="text-muted-foreground">{t.download.text}</p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button
              variant="default"
              onClick={() => handleDownload("csv")}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t.download.csvButton}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload("excel")}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t.download.excelButton}
            </Button>
          </div>
        </section>

        {/* Section GitHub */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Code className="h-5 w-5" />
            {t.github.title}
          </h3>
          <p className="text-muted-foreground">{t.github.text}</p>
          <div className="pt-2">
            <Link
              href="https://github.com/big-emotion/ethniafrique-atlas"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="default" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                {t.github.button}
              </Button>
            </Link>
          </div>
        </section>

        {/* Section Contact / Typeform */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t.contact.title}
          </h3>
          <p className="text-muted-foreground">{t.contact.text}</p>
          <div className="w-full">
            <div data-tf-live="01K9T08MHEFWHMK9NBWKE46DV6" />
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
