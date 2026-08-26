"use client";

import dynamic from "next/dynamic";

import type { GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";

// The play loop is interactive by definition: nothing about it is worth
// rendering on the server, and keeping it out of the SSR payload leaves the
// game page itself a plain server component.
const LazyGamePlayIsland = dynamic(
  () =>
    import("@/components/play/GamePlayIsland").then(
      (mod) => mod.GamePlayIsland
    ),
  { ssr: false }
);

export interface GamePlayHostProps {
  game: GameDefinition;
  rounds: GameRound[];
}

/**
 * Boundary between the server-rendered game page and the client play loop
 * (REQ-120). The rounds are already resolved when they reach here — this
 * component exists only to defer the island, which is why it holds no state
 * of its own, unlike the quiz host and its segment picker.
 */
// @req REQ-120
export const GamePlayHost = ({ game, rounds }: GamePlayHostProps) => {
  return <LazyGamePlayIsland game={game} rounds={rounds} />;
};

export default GamePlayHost;
