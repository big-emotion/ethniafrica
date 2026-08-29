"use client";

import { useEffect } from "react";

import { BinaryChoice } from "@/components/play/BinaryChoice";
import { EstimateSlider } from "@/components/play/EstimateSlider";
import { GameAnswerReveal } from "@/components/play/GameAnswerReveal";
import { GameScoreCard } from "@/components/play/GameScoreCard";
import { ScaleFactCard } from "@/components/play/ScaleFactCard";
import { QuizProgressDots } from "@/components/quiz/QuizProgressDots";
import {
  useGameSession,
  type GameSessionStatus,
} from "@/hooks/use-game-session";
import { isEstimateRound, type GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import type { ScaleFact } from "@/lib/games/scaleFacts";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { cn } from "@/lib/utils";

export interface GamePlayIslandProps {
  game: GameDefinition;
  rounds: GameRound[];
  /**
   * The measured scale facts. One is stated on every other reveal, and the
   * whole bank is laid out on the score card — see `ScaleFactCard` for why
   * they are not offered as a mode the reader has to choose.
   */
  facts?: ScaleFact[];
  /** True when the corpus could not fill the session; stated, never hidden. */
  corpusLimited?: boolean;
  /**
   * Told which phase the session is in, so a caller can react to it. The
   * Mercator page uses it to hold the globe flat while a question stands and
   * open it on the reveal; it is optional because nothing else needs to know.
   */
  onPhaseChange?: (status: GameSessionStatus) => void;
  className?: string;
}

/** A fact lands on every other reveal — often enough to be part of the
 *  session's rhythm, rarely enough that it never becomes the session. */
const FACT_EVERY = 2;

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
  facts = [],
  corpusLimited = false,
  onPhaseChange,
  className,
}: GamePlayIslandProps) => {
  const session = useGameSession(rounds);
  const { currentRound, status } = session;

  useEffect(() => {
    onPhaseChange?.(status);
  }, [status, onPhaseChange]);

  const factForReveal =
    facts.length > 0 && (session.currentIndex + 1) % FACT_EVERY === 0
      ? facts[Math.floor(session.currentIndex / FACT_EVERY) % facts.length]
      : null;

  return (
    <div
      data-testid="game-play-island"
      className={cn(
        ACCENT_BY_ACCESS_MODE.jouer,
        "flex flex-col gap-4",
        className
      )}
    >
      {status === "finished" || !currentRound ? (
        <GameScoreCard
          game={game}
          correct={session.correctCount}
          total={session.totalRounds}
          facts={facts}
          corpusLimited={corpusLimited}
          onPlayAgain={session.restart}
        />
      ) : (
        <>
          <QuizProgressDots
            current={session.currentIndex + 1}
            total={session.totalRounds}
          />
          {status === "answering" ? (
            isEstimateRound(currentRound) ? (
              // Keyed by the subject so the track resets between rounds: the
              // slider holds the reader's value in state, and a reused
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
            <>
              <GameAnswerReveal
                round={currentRound}
                isCorrect={session.verdict ?? false}
                isLastRound={session.currentIndex + 1 >= session.totalRounds}
                answer={session.selectedAnswer}
                onNext={session.next}
              />
              {factForReveal ? <ScaleFactCard fact={factForReveal} /> : null}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default GamePlayIsland;
