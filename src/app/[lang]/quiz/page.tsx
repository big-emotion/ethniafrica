import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { QuizPlayHost } from "@/components/quiz/QuizPlayHost";
import { getQuizSegmentsHandler } from "@/api/v2/handlers/quiz";
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
  // No gate. A bank with nothing in it is not a missing page: the segment
  // picker already disables a segment holding no question and says so, which
  // is an honest empty state rather than a 404 on a route that exists.
  const envelope = await getQuizSegmentsHandler();

  return (
    <PageLayout language="fr" title={t.pageTitle} subtitle={t.pageSubtitle}>
      <QuizPlayHost segments={envelope.data.segments} />
    </PageLayout>
  );
}
