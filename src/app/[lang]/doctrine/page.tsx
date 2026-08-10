"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { Language } from "@/types/shared";
import DoctrinePageContent from "@/components/pages/DoctrinePageContent";

/**
 * /fr/doctrine — Editorial doctrine page for the classification_status enum.
 *
 * Story ETNI-178 / 0.21 (AR21, AR44). Content lives in DoctrinePageContent
 * (src/components/pages/DoctrinePageContent.tsx) — see that file for the
 * anchors ClassificationBadge links to.
 */
// @req REQ-091
export default function DoctrinePage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    if (lang && ["fr"].includes(lang) && lang !== language) {
      setLanguage(lang as Language);
    }
  }, [lang, language, setLanguage]);

  return (
    <PageLayout language={language} onLanguageChange={setLanguage} hideHeader>
      <DoctrinePageContent />
    </PageLayout>
  );
}
