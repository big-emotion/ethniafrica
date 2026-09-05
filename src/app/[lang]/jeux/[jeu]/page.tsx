import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { MercatorSurface } from "@/components/mercator/MercatorSurface";
import { getGameRoundsHandler } from "@/api/v2/handlers/games";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import {
  buildScaleFacts,
  buildTrueSizeClaim,
  pickScaleFacts,
} from "@/lib/games/scaleFacts";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { OG_TITLE } from "@/lib/brand";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";

interface GamePageProps {
  params: Promise<{ lang: string; jeu: string }>;
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
// @req REQ-141
export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { lang, jeu } = await params;
  const game = getGameBySlug(jeu);
  if (!game) return {};

  const copy = {
    title: `${game.nameFr} — ${OG_TITLE}`,
    description: game.promptFr,
  };
  return {
    ...copy,
    ...surfaceHead(
      lang as Language,
      "games",
      (locale) => `${getAxisHubRoute(locale, "jeux")}/${game.slug}`,
      copy
    ),
  };
}

// @req REQ-120
export default async function GamePage({ params }: GamePageProps) {
  const { lang, jeu } = await params;
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

  // The continent the Mercator stage draws. Caught the way the atlas hub
  // catches it: a failed count costs the per-country field, not the round.
  const [envelope, peopleCountsByCountry] = await Promise.all([
    getGameRoundsHandler(game, seed),
    getContinentPeopleCounts().catch(() => undefined),
  ]);

  // Measured server-side and handed down, the way the rounds are: summing
  // fifty-eight outlines is a few hundred thousand trigonometric calls, and
  // there is no reason to spend them in the reader's browser. The whole bank
  // travels — the session states one fact every other reveal, and the score
  // card lays out all of them.
  const facts = pickScaleFacts(buildScaleFacts().length, seed);

  return (
    <PageLayout
      language={lang as Language}
      title={game.nameFr}
      subtitle={game.promptFr}
      trailLabel={game.nameFr}
    >
      {/* The page is named after a projection, so it shows the projection —
          on the home's own globe, mounted here prop for prop, with the morph
          bar the reader moves from sphere to flat map and back while Tissot's
          indicatrices hold their real area throughout.

          It is no longer pinned to the round. See `MercatorSurface` for why
          the pin was withdrawn (charter §11, amended 2026-09-06) and how the
          fold rule of §9.1 is still met without shrinking the globe. */}
      {/* The axis accent, bound here because nothing else on this route binds
          it. `AccessModeHub` carries it on the hub itself, but a game page is
          not a hub, so `--accent` fell through to the bare shadcn HSL triplet
          that shares the name — an invalid colour in `fill:` and
          `border-color:`.
          BinaryChoice's selected option, GameAnswerReveal's banner and
          GameScoreCard all read it, so the whole surface has been painting
          black-or-nothing rather than pervenche (atlas-charter §2). */}
      <div className={ACCENT_BY_ACCESS_MODE.jeux}>
        <MercatorSurface
          language={lang as Language}
          game={game}
          rounds={envelope.data.rounds}
          facts={facts}
          corpusLimited={envelope.data.corpusLimited}
          /* Measured here rather than in the island: the sweep reads the world
             comparison outlines, which have no business in a browser bundle. */
          trueSizeClaimFr={buildTrueSizeClaim()}
          peopleCountsByCountry={peopleCountsByCountry}
        />
      </div>
    </PageLayout>
  );
}
