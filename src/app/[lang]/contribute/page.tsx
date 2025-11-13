"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/PageLayout";
import { useEffect } from "react";
import { Language } from "@/types/ethnicity";
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
import { Card } from "@/components/ui/card";

export default function ContributePage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  // Sync language from URL param
  useEffect(() => {
    if (lang && ["en", "fr", "es", "pt"].includes(lang) && lang !== language) {
      setLanguage(lang as Language);
    }
  }, [lang, language, setLanguage]);

  const content = {
    en: {
      title: "Contribute",
      intro: {
        title: "Contribution and participation",
        text1: (
          <>
            For now, the site is powered by <strong>CSV files</strong> that
            contain data on countries, regions, and ethnic groups. I keep
            searching and structuring this information over time.
          </>
        ),
        text2: (
          <>
            I am{" "}
            <strong>open to all kinds of proposals and contributions</strong>,
            whether it's sharing CSV data, sources, corrections, or improvement
            ideas. If you'd like to help, feel free to contact me or contribute
            directly through the{" "}
            <a
              href="https://github.com/big-emotion/ethniafrique-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              GitHub repository
            </a>
            .
          </>
        ),
      },
      apiDocs: {
        title: "API Documentation",
        text: "Access the complete API documentation to understand how to retrieve data programmatically. The API provides endpoints for regions, countries, and ethnicities with detailed demographic information.",
        button: "View API Documentation",
      },
      download: {
        title: "Download Data",
        text: "Download all the data in CSV or Excel format for your own use, analysis, or contributions.",
        csvButton: "Download CSV (ZIP)",
        excelButton: "Download Excel",
      },
      contact: {
        title: "Contact",
        text: "Would you like to contact me or propose a contribution? Use the form below.",
      },
      github: {
        title: "Contribute via GitHub",
        text: "The project is open source and hosted on GitHub. You can contribute by submitting issues, pull requests, or by improving the codebase.",
        button: "Contribute on GitHub",
      },
      footer: "Made with emotion for Africa",
    },
    fr: {
      title: "Contribuer",
      intro: {
        title: "Contribution et participation",
        text1: (
          <>
            Pour le moment, le site est alimenté à partir de{" "}
            <strong>fichiers CSV</strong> regroupant les données sur les pays,
            les régions et les ethnies. Je continue à rechercher ces données et
            à les structurer au fur et à mesure.
          </>
        ),
        text2: (
          <>
            Je suis{" "}
            <strong>ouvert à toutes les propositions ou contributions</strong>,
            qu'il s'agisse de partager des fichiers CSV, des sources, des
            corrections, ou simplement des idées d'amélioration. Si vous
            souhaitez aider, n'hésitez pas à me contacter ou à proposer
            directement sur le{" "}
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
        text: "Consultez la documentation complète de l'API pour comprendre comment récupérer les données de manière programmatique. L'API fournit des endpoints pour les régions, pays et ethnies avec des informations démographiques détaillées.",
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
    es: {
      title: "Contribuir",
      intro: {
        title: "Contribución y participación",
        text1: (
          <>
            Por ahora, el sitio se alimenta de <strong>archivos CSV</strong> que
            contienen datos sobre países, regiones y grupos étnicos. Sigo
            buscando y estructurando esta información poco a poco.
          </>
        ),
        text2: (
          <>
            Estoy{" "}
            <strong>abierto a todo tipo de propuestas y contribuciones</strong>,
            ya sea compartir archivos CSV, fuentes, correcciones o ideas para
            mejorar. Si quieres ayudar, puedes contactarme o contribuir
            directamente en el{" "}
            <a
              href="https://github.com/big-emotion/ethniafrique-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              repositorio de GitHub
            </a>
            .
          </>
        ),
      },
      apiDocs: {
        title: "Documentación API",
        text: "Accede a la documentación completa de la API para entender cómo recuperar los datos de forma programática. La API proporciona endpoints para regiones, países y etnias con información demográfica detallada.",
        button: "Ver documentación API",
      },
      download: {
        title: "Descargar datos",
        text: "Descarga todos los datos en formato CSV o Excel para tu propio uso, análisis o contribuciones.",
        csvButton: "Descargar CSV (ZIP)",
        excelButton: "Descargar Excel",
      },
      contact: {
        title: "Contacto",
        text: "¿Deseas contactarme o proponer una contribución? Utiliza el formulario a continuación.",
      },
      github: {
        title: "Contribuir vía GitHub",
        text: "El proyecto es de código abierto y está alojado en GitHub. Puedes contribuir enviando issues, pull requests o mejorando el código fuente.",
        button: "Contribuir en GitHub",
      },
      footer: "Hecho con emoción para África",
    },
    pt: {
      title: "Contribuir",
      intro: {
        title: "Contribuição e participação",
        text1: (
          <>
            Por enquanto, o site é alimentado por <strong>arquivos CSV</strong>{" "}
            com dados sobre países, regiões e grupos étnicos. Continuo
            pesquisando e estruturando essas informações com o tempo.
          </>
        ),
        text2: (
          <>
            Estou{" "}
            <strong>aberto a qualquer tipo de proposta ou contribuição</strong>,
            seja compartilhando arquivos CSV, fontes, correções ou ideias de
            melhoria. Se quiser ajudar, entre em contato comigo ou contribua
            diretamente no{" "}
            <a
              href="https://github.com/big-emotion/ethniafrique-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              repositório GitHub
            </a>
            .
          </>
        ),
      },
      apiDocs: {
        title: "Documentação API",
        text: "Acesse a documentação completa da API para entender como recuperar os dados de forma programática. A API fornece endpoints para regiões, países e etnias com informações demográficas detalhadas.",
        button: "Ver documentação API",
      },
      download: {
        title: "Baixar dados",
        text: "Baixe todos os dados em formato CSV ou Excel para seu próprio uso, análise ou contribuições.",
        csvButton: "Baixar CSV (ZIP)",
        excelButton: "Baixar Excel",
      },
      contact: {
        title: "Contato",
        text: "Deseja entrar em contato comigo ou propor uma contribuição? Use o formulário abaixo.",
      },
      github: {
        title: "Contribuir via GitHub",
        text: "O projeto é open source e está hospedado no GitHub. Você pode contribuir enviando issues, pull requests ou melhorando o código fonte.",
        button: "Contribuir no GitHub",
      },
      footer: "Feito com emoção para a África",
    },
  };

  const t = content[language];

  const handleDownload = (format: "csv" | "excel") => {
    window.open(`/api/download?format=${format}`, "_blank");
  };

  return (
    <PageLayout language={language} onLanguageChange={setLanguage}>
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-display font-bold">{t.title}</h1>

        {/* Section Intro */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">{t.intro.title}</h2>
          <p>{t.intro.text1}</p>
          <p>{t.intro.text2}</p>
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
            strategy="lazyOnload"
          />
        </section>
      </div>
    </PageLayout>
  );
}
