"use client";

import dynamic from "next/dynamic";

import { BinaryChoice } from "@/components/play/BinaryChoice";
import { GameAnswerReveal } from "@/components/play/GameAnswerReveal";
import { GameScoreCard } from "@/components/play/GameScoreCard";
import { QuizProgressDots } from "@/components/quiz/QuizProgressDots";
import { useGameSession } from "@/hooks/use-game-session";
import type { GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { cn } from "@/lib/utils";

// The globe primitive pulls in the WebGL scene: it is loaded only for the
// game that actually asks the reader to tap a country.
const LazyGlobeTap = dynamic(
  () => import("@/components/play/GlobeTap").then((mod) => mod.GlobeTap),
  { ssr: false }
);

export interface GamePlayIslandProps {
  game: GameDefinition;
  rounds: GameRound[];
  className?: string;
}

/**
 * The play loop shared by the three games (REQ-120).
 *
 * The rounds arrive as props: the Jouer hub has no public API route, the page
 * resolves every round server-side, so this island never fetches. Progress is
 * shown through the quiz's own `QuizProgressDots` rather than a second
 * indicator — two components counting the same thing would drift apart.
 */
// @req REQ-120
export const GamePlayIsland = ({
  game,
  rounds,
  className,
}: GamePlayIslandProps) => {
  const session = useGameSession(rounds);
  const { currentRound } = session;

  function renderPrimitive(round: GameRound) {
    switch (round.kind) {
      case "binary":
        return <BinaryChoice round={round} onAnswer={session.answer} />;
      case "globeTap":
        return (
          <LazyGlobeTap
            promptFr={round.promptFr}
            choices={round.choices}
            onChoose={session.answer}
          />
        );
    }
  }

  return (
    <div
      data-testid="game-play-island"
      className={cn(
        ACCENT_BY_ACCESS_MODE.jouer,
        "flex flex-col gap-4",
        className
      )}
    >
      {session.status === "finished" || !currentRound ? (
        <GameScoreCard
          game={game}
          correct={session.correctCount}
          total={session.totalRounds}
          onPlayAgain={session.restart}
        />
      ) : (
        <>
          <QuizProgressDots
            current={session.currentIndex + 1}
            total={session.totalRounds}
          />
          {session.status === "answering" ? (
            renderPrimitive(currentRound)
          ) : (
            <GameAnswerReveal
              round={currentRound}
              isCorrect={session.verdict ?? false}
              isLastRound={session.currentIndex + 1 >= session.totalRounds}
              onNext={session.next}
            />
          )}
        </>
      )}
    </div>
  );
};

export default GamePlayIsland;
