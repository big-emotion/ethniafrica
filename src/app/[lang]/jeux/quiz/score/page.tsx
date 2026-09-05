/**
 * /[lang]/quiz/score — stateless, shareable score page (Epic 10, Story
 * 10.10, ETNI-499, ETNI-1140, FR70). The URL alone reconstructs the card:
 * ?pays=|famille=|mode=&correct=&total=, validated through the same shared Zod
 * schema (scoreCardParams.ts) as the OG endpoint so forged params 404 in
 * both places — no personal data ever transits through this URL.
 *
 * The track's name is read from the corpus by its id, and a card whose id
 * names nothing 404s. That is what keeps a share URL from writing its own
 * caption on a page that carries the site's typography.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  parseScoreCardParams,
  scoreCardScope,
  scoreCardSearchParams,
  type ScoreCardParams,
} from "@/lib/quiz/scoreCardParams";
import { describeScope } from "@/api/v2/handlers/quiz";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";
import { QuizScoreSharePage } from "./QuizScoreSharePage";

type ScoreSearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<ScoreSearchParams>;
}

function buildOgImageUrl(params: ScoreCardParams): string {
  const search = scoreCardSearchParams(
    scoreCardScope(params),
    params.correct,
    params.total
  );
  return `/api/og/quiz-score?${search.toString()}`;
}

// @req REQ-103 FR70
export async function generateMetadata({
  params: routeParams,
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = parseScoreCardParams(await searchParams);
  if (!params) {
    return {};
  }

  const scope = await describeScope(scoreCardScope(params));
  if (!scope) {
    return {};
  }

  const { lang } = await routeParams;
  const t = getTranslation(lang as Language).quiz;
  const title = t.scoreHeading;
  const description = `${params.correct} ${t.scoreCardExactAnswersSeparator} ${params.total} — ${scope.labelFr}`;
  const imageUrl = buildOgImageUrl(params);

  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

// @req REQ-103 FR70 AR39
export default async function QuizScorePage({
  params: routeParams,
  searchParams,
}: PageProps) {
  const params = parseScoreCardParams(await searchParams);
  if (!params) {
    notFound();
  }

  const scope = scoreCardScope(params);
  const described = await describeScope(scope);
  if (!described) {
    notFound();
  }

  const { lang } = await routeParams;
  const language = lang as Language;
  const t = getTranslation(language).quiz;

  return (
    <PageLayout language={language} title={t.scoreHeading}>
      <QuizScoreSharePage
        language={language}
        scope={scope}
        scopeLabelFr={described.labelFr}
        correct={params.correct}
        total={params.total}
      />
    </PageLayout>
  );
}
