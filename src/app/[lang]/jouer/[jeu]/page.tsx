import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageLayout } from "@/components/layout/PageLayout";
import { GamePlayHost } from "@/components/play/GamePlayHost";
import { GameScopePicker } from "@/components/play/GameScopePicker";
import { getGameRoundsHandler } from "@/api/v2/handlers/games";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { OG_TITLE } from "@/lib/brand";

interface GamePageProps {
  params: Promise<{ jeu: string }>;
  /** `?pays=GHA` / `?famille=FLG_…` — the session's scope, absent for the whole corpus. */
  searchParams: Promise<{ pays?: string; famille?: string }>;
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
    alternates: { canonical: `${getAxisHubRoute("fr", "jouer")}/${game.slug}` },
  };
}

// @req REQ-120
export default async function GamePage({
  params,
  searchParams,
}: GamePageProps) {
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

  // The scope rides in the URL rather than in component state so a narrowed
  // session is a page a reader can bookmark, share and come back to — and so
  // the rounds keep being built once, on the server, from what the address
  // says.
  const { pays, famille } = await searchParams;
  const envelope = await getGameRoundsHandler(game, seed, {
    countryId: pays,
    familyId: famille,
  });
  const { scope, scopeChoices } = envelope.data;

  return (
    <PageLayout language="fr" title={game.nameFr} subtitle={game.promptFr}>
      {scopeChoices ? (
        <GameScopePicker
          choices={scopeChoices}
          scope={scope}
          action={`${getAxisHubRoute("fr", "jouer")}/${game.slug}`}
          className="mb-4"
        />
      ) : null}
      <GamePlayHost game={game} rounds={envelope.data.rounds} />
    </PageLayout>
  );
}
