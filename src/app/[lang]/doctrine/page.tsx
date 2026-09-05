"use client";

import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import DoctrinePageContent from "@/components/pages/DoctrinePageContent";

/**
 * /[lang]/doctrine — Editorial doctrine page for the classification_status enum.
 *
 * Story ETNI-178 / 0.21 (AR21, AR44). Content lives in DoctrinePageContent
 * (src/components/pages/DoctrinePageContent.tsx) — see that file for the
 * anchors ClassificationBadge links to.
 *
 * `useLanguage` reads the route's locale itself, so nothing here syncs it
 * back: the effect that used to would write the locale cookie, which only
 * the switcher may do (REQ-140).
 */
// @req REQ-091
export default function DoctrinePage() {
  const { language, setLanguage } = useLanguage();

  return (
    <PageLayout language={language} onLanguageChange={setLanguage} hideHeader>
      <DoctrinePageContent />
    </PageLayout>
  );
}
