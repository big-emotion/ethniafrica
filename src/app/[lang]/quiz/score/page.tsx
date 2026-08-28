/**
 * /[lang]/quiz/score — stateless, shareable score page (Epic 10, Story
 * 10.10, ETNI-499, ETNI-1140, FR70). The URL alone reconstructs the card:
 * ?segment=&correct=&total=&rung=, validated through the same shared Zod
 * schema (scoreCardParams.ts) as the OG endpoint so forged params 404 in
 * both places — no personal data ever transits through this URL.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  parseScoreCardParams,
  type ScoreCardParams,
} from "@/lib/quiz/scoreCardParams";
import { translations } from "@/lib/translations";
import { QuizScoreSharePage } from "./QuizScoreSharePage";

const t = translations.fr.quiz;

type ScoreSearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  searchParams: Promise<ScoreSearchParams>;
}

function buildOgImageUrl(params: ScoreCardParams): string {
  const search = new URLSearchParams({
    segment: params.segment,
    correct: String(params.correct),
    total: String(params.total),
    rung: String(params.rung),
  });
  return `/api/og/quiz-score?${search.toString()}`;
}

// @req REQ-103 FR70
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = parseScoreCardParams(await searchParams);
  if (!params) {
    return {};
  }

  const title = t.scoreHeading;
  const description = `${params.correct} ${t.scoreCardExactAnswersSeparator} ${params.total} — ${t.segments[params.segment]}`;
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
export default async function QuizScorePage({ searchParams }: PageProps) {
  const params = parseScoreCardParams(await searchParams);
  if (!params) {
    notFound();
  }

  return (
    <PageLayout language="fr" title={t.scoreHeading}>
      <QuizScoreSharePage
        segment={params.segment}
        correct={params.correct}
        total={params.total}
        rung={params.rung}
      />
    </PageLayout>
  );
}
