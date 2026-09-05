import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { MercatorSurface } from "@/components/mercator/MercatorSurface";
import { getGameRoundsHandler } from "@/api/v2/handlers/games";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { buildScaleFacts, pickScaleFacts } from "@/lib/games/scaleFacts";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { OG_TITLE } from "@/lib/brand";
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
export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { lang, jeu } = await params;
  const game = getGameBySlug(jeu);
  if (!game) return {};

  return {
    title: `${game.nameFr} — ${OG_TITLE}`,
    description: game.promptFr,
    alternates: {
      canonical: `${getAxisHubRoute(lang as Language, "jeux")}/${game.slug}`,
    },
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

          It no longer merely stands above the rounds. `MercatorSurface` binds
          the two, so the map is held flat while a question stands and closes
          into a sphere on the reveal — see that component for why this obeys
          charter §1 rather than breaking it, and how the fold rule of §9.1 is
          met without shrinking the globe. */}
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
          peopleCountsByCountry={peopleCountsByCountry}
        />
      </div>
    </PageLayout>
  );
}
