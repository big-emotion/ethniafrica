import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { GamePlayHost } from "@/components/play/GamePlayHost";
import { getGameRoundsHandler } from "@/api/v2/handlers/games";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { OG_TITLE } from "@/lib/brand";

interface GamePageProps {
  params: Promise<{ jeu: string }>;
}

/**
 * One dynamic route for all eleven games (REQ-120). Eleven routes would be
 * eleven copies of this file; the registry already distinguishes them.
 *
 * No `generateStaticParams` here, deliberately: the root layout awaits
 * `connection()` for the CSP nonce, so opting this route into static rendering
 * makes Next throw DYNAMIC_SERVER_USAGE on every request. An unknown slug is
 * already turned away by `getGameBySlug` below, which is all the enumeration
 * bought. See src/app/__tests__/staticParamsBan.test.ts.
 */
// @req REQ-120
export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { jeu } = await params;
  const game = getGameBySlug(jeu);
  if (!game) return {};

  return {
    title: `${game.nameFr} — ${OG_TITLE}`,
    description: game.promptFr,
    alternates: { canonical: `/fr/jouer/${game.slug}` },
  };
}

// @req REQ-120
export default async function GamePage({ params }: GamePageProps) {
  const { jeu } = await params;
  const game = getGameBySlug(jeu);
  if (!game) notFound();

  // The rounds are built here, in the server component, and handed to the
  // island as props — there is no public games endpoint to fetch from.
  //
  // The seed offsets each game into a different stretch of the corpus pool so
  // two games reading `afrik_peoples` do not open on the same peoples. It is
  // derived from the slug rather than from a clock: a time-based seed is
  // impure in render, and a deterministic one keeps the page cacheable and
  // the rounds reproducible in a test — the same discipline correctOptionIndex
  // applies to answer placement.
  const seed = [...game.slug].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );
  const envelope = await getGameRoundsHandler(game, seed);

  return (
    <PageLayout language="fr" title={game.nameFr} subtitle={game.promptFr}>
      <GamePlayHost game={game} rounds={envelope.data.rounds} />
    </PageLayout>
  );
}
