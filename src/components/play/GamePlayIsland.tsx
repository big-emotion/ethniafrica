"use client";

import { BinaryChoice } from "@/components/play/BinaryChoice";
import { EstimateSlider } from "@/components/play/EstimateSlider";
import { GameAnswerReveal } from "@/components/play/GameAnswerReveal";
import { GameScoreCard } from "@/components/play/GameScoreCard";
import { QuizProgressDots } from "@/components/quiz/QuizProgressDots";
import { useGameSession } from "@/hooks/use-game-session";
import { isEstimateRound, type GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { cn } from "@/lib/utils";

export interface GamePlayIslandProps {
  game: GameDefinition;
  rounds: GameRound[];
  className?: string;
}

/**
 * The play loop of the Jouer hub's game (REQ-120).
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
            isEstimateRound(currentRound) ? (
              // Keyed by the subject so the track resets between rounds:
              // the slider holds the reader's value in state, and a reused
              // instance would open the next round already answered.
              <EstimateSlider
                key={currentRound.subjectId}
                round={currentRound}
                onAnswer={session.answer}
              />
            ) : (
              <BinaryChoice round={currentRound} onAnswer={session.answer} />
            )
          ) : (
            <GameAnswerReveal
              round={currentRound}
              isCorrect={session.verdict ?? false}
              isLastRound={session.currentIndex + 1 >= session.totalRounds}
              answer={session.selectedAnswer}
              onNext={session.next}
            />
          )}
        </>
      )}
    </div>
  );
};

export default GamePlayIsland;
