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
import { requestSeed } from "@/lib/games/session";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { OG_TITLE } from "@/lib/brand";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import type { Language } from "@/types/shared";
import { GAME_DEFINITIONS_EN } from "@/lib/games/gameRegistry.en";
import {
  buildScaleFactsEn,
  buildTrueSizeClaimEn,
} from "@/lib/games/scaleFacts.en";

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
  const language = lang as Language;
  const gameWording = GAME_DEFINITIONS_EN[game.id];
  const name = language === "en" ? gameWording.nameEn : game.nameFr;
  const prompt = language === "en" ? gameWording.promptEn : game.promptFr;

  const copy = {
    title: `${name} — ${OG_TITLE}`,
    description: prompt,
  };
  return {
    ...copy,
    ...surfaceHead(
      language,
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
  const language = lang as Language;
  const gameWording = GAME_DEFINITIONS_EN[game.id];
  const gameName = language === "en" ? gameWording.nameEn : game.nameFr;
  const gamePrompt = language === "en" ? gameWording.promptEn : game.promptFr;

  // The rounds are built here, in the server component, and handed to the
  // island as props — there is no public games endpoint to fetch from.
  //
  // The seed rotates the pool before the pairs are formed, so it decides which
  // session a reader is served. It used to be the slug's character sum, which
  // is a constant, and the reasoning for that is answered in `lib/games/session`
  // — briefly: nothing re-derives these rounds on the client, and this route
  // was never cacheable. What the constant cost is that every visitor, on every
  // reload, was handed the same eight rounds.
  const seed = requestSeed();

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
  const englishFacts = buildScaleFactsEn();
  const facts = pickScaleFacts(buildScaleFacts().length, seed).map((fact) => ({
    ...fact,
    headlineEn: englishFacts[fact.id]?.headlineEn,
    bodyEn: englishFacts[fact.id]?.bodyEn,
  }));

  return (
    <PageLayout
      language={language}
      title={gameName}
      subtitle={gamePrompt}
      trailLabel={gameName}
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
          trueSizeClaimEn={buildTrueSizeClaimEn()}
          peopleCountsByCountry={peopleCountsByCountry}
        />
      </div>
    </PageLayout>
  );
}
