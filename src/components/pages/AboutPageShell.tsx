"use client";

import type { ReactNode } from "react";

import { PageLayout } from "@/components/layout/PageLayout";
import { useLanguage } from "@/hooks/use-language";

interface AboutPageShellProps {
  children: ReactNode;
}

/**
 * Client-only shell kept outside the server route.
 *
 * It no longer syncs the route's locale into the hook: `useLanguage` reads
 * the route itself, and `setLanguage` is the switcher's act — it records an
 * explicit choice in the cookie (REQ-140), which landing on a page is not.
 */
// @req REQ-091
export default function AboutPageShell({ children }: AboutPageShellProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <PageLayout language={language} onLanguageChange={setLanguage} hideHeader>
      {children}
    </PageLayout>
  );
}
