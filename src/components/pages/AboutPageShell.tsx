"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useParams } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { useLanguage } from "@/hooks/use-language";
import type { Language } from "@/types/shared";

interface AboutPageShellProps {
  children: ReactNode;
}

/** Client-only language synchronization kept outside the server route. */
// @req REQ-091
export default function AboutPageShell({ children }: AboutPageShellProps) {
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
      {children}
    </PageLayout>
  );
}
