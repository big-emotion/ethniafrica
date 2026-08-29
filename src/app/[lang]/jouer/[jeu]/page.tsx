import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { GamePlayHost } from "@/components/play/GamePlayHost";
import { MercatorProjectionStage } from "@/components/play/MercatorProjectionStage";
import { getGameRoundsHandler } from "@/api/v2/handlers/games";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
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
      {/* The page is named after a projection, so it shows the projection:
          the flat Mercator map, the slider that undoes the distortion, and
          Tissot's indicatrices keeping the same real area throughout. This
          replaces the home's globe, which stood in for it and argued about a
          projection while showing none of it — reading about the distortion
          and watching it undo itself are not the same lesson.

          The slider's far end is an equal-area *map*, not a sphere, which
          departs from how this was first written down. Deliberately: putting
          a globe at that end changes two things at once — the projection and
          the dimensionality — so a reader could not tell whether the north
          shrank because the stretch was removed or because curvature had
          hidden half of it. Flat at both ends isolates the one variable the
          game is about, which is also what makes the indicatrices legible.

          It stands above the rounds rather than beside them. The stage is the
          page's argument and the rounds are the questions it earns; a map set
          next to a live question would let the reader answer by eye, which is
          the shape-guessing the charter retired as a category (§1). */}
      {/* The axis accent, bound here because nothing else on this route binds
          it. `AccessModeHub` carries it on the hub itself, but a game page is
          not a hub, so `--accent` fell through to the bare shadcn HSL triplet
          that shares the name — an invalid colour in `fill:` and
          `border-color:`.
          BinaryChoice's selected option, GameAnswerReveal's banner and
          GameScoreCard all read it, so the whole surface has been painting
          black-or-nothing rather than pervenche (atlas-charter §2). */}
      <div className={ACCENT_BY_ACCESS_MODE.jouer}>
        <MercatorProjectionStage />

        <GamePlayHost game={game} rounds={envelope.data.rounds} />
      </div>
    </PageLayout>
  );
}
