import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { GamePlayHost } from "@/components/play/GamePlayHost";
import { HomeGlobeStage } from "@/components/home/HomeGlobeStage";
import { getGameRoundsHandler } from "@/api/v2/handlers/games";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { OG_TITLE } from "@/lib/brand";

interface GamePageProps {
  params: Promise<{ jeu: string }>;
}

/**
 * One dynamic route for the hub's game (REQ-120). The registry is what
 * distinguishes a game, so a route per game would be a copy of this file each
 * time one is rebuilt against the charter.
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
    alternates: { canonical: `${getAxisHubRoute("fr", "jouer")}/${game.slug}` },
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
  // The seed is derived from the slug rather than from a clock: a time-based
  // seed is impure in render, and a deterministic one keeps the page cacheable
  // and the rounds reproducible in a test — the same discipline
  // correctOptionIndex applies to answer placement.
  const seed = [...game.slug].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );

  const envelope = await getGameRoundsHandler(game, seed);

  return (
    <PageLayout
      language="fr"
      title={game.nameFr}
      subtitle={game.promptFr}
      trailLabel={game.nameFr}
    >
      {/* The same globe the home opens on, deliberately — not a second
          rendering of the same idea. The page is named after a projection, so
          it owes the reader the projection itself: the flat Mercator map, and
          the slider that closes it back into a globe while Tissot's
          indicatrices keep the same real area throughout. Reading about the
          distortion and watching it undo itself are not the same lesson.

          It stands above the rounds rather than beside them. The stage is the
          page's argument and the rounds are the questions it earns; a globe
          set next to a live question would let the reader answer by eye, which
          is the shape-guessing the charter retired as a category (§1). */}
      <HomeGlobeStage />

      <GamePlayHost game={game} rounds={envelope.data.rounds} />
    </PageLayout>
  );
}
