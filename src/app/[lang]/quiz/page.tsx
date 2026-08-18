import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/layout/PageLayout";
import { QuizPlayHost } from "@/components/quiz/QuizPlayHost";
import { getQuizSegmentsHandler } from "@/api/v2/handlers/quiz";
import { isQuizFeatureEnabled } from "@/lib/featureFlags";
import { translations } from "@/lib/translations";

const t = translations.fr.quiz;

// @req REQ-103 FR66
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.pageSubtitle,
  alternates: {
    canonical: "/fr/quiz",
  },
};

// @req REQ-103 FR66 FR43 AR39
export default async function QuizPage() {
  if (!isQuizFeatureEnabled()) {
    notFound();
  }

  const envelope = await getQuizSegmentsHandler();

  return (
    <PageLayout language="fr" title={t.pageTitle} subtitle={t.pageSubtitle}>
      <QuizPlayHost segments={envelope.data.segments} />
    </PageLayout>
  );
}
