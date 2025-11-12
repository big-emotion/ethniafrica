"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/PageLayout";
import { useEffect } from "react";

export default function AboutPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  // Sync language from URL param
  useEffect(() => {
    if (lang && ["en", "fr", "es", "pt"].includes(lang) && lang !== language) {
      setLanguage(lang as any);
    }
  }, [lang, language, setLanguage]);

  return (
    <PageLayout language={language} onLanguageChange={setLanguage}>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-display font-bold">
          {language === "en"
            ? "About"
            : language === "fr"
            ? "À propos"
            : language === "es"
            ? "Acerca de"
            : "Sobre"}
        </h1>
        <p className="text-muted-foreground">
          {language === "en"
            ? "This is a comprehensive multilingual encyclopedia of African ethnic groups."
            : language === "fr"
            ? "Ceci est une encyclopédie multilingue complète des groupes ethniques africains."
            : language === "es"
            ? "Esta es una enciclopedia multilingüe completa de los grupos étnicos africanos."
            : "Esta é uma enciclopédia multilíngue abrangente dos grupos étnicos africanos."}
        </p>
      </div>
    </PageLayout>
  );
}

