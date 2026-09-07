"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
import { trackEvent } from "@/lib/analytics/trackEvent";
import { takeSession } from "@/lib/games/session";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/shared";

export interface GamePlayIslandProps {
  game: GameDefinition;
  rounds: GameRound[];
  language: Language;
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
  language,
  facts = [],
  corpusLimited = false,
  onPhaseChange,
  className,
}: GamePlayIslandProps) => {
  // Which session of the pool is being played. The pool arrives longer than
  // one session and the page's seed is a constant, so without this every
  // reader would replay the rounds they just finished.
  const [sessionIndex, setSessionIndex] = useState(0);

  const sessionRounds = useMemo(
    () => takeSession(rounds, game.roundsPerSession, sessionIndex),
    [rounds, game.roundsPerSession, sessionIndex]
  );

  const session = useGameSession(sessionRounds);
  const { currentRound, status } = session;

  const playAgain = useCallback(() => {
    setSessionIndex((index) => index + 1);
    session.restart();
    // `session.restart` is a fresh closure each render and depending on it
    // would rebuild this callback every time, which the score card would see
    // as a changed prop on every render of a static screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onPhaseChange?.(status);
  }, [status, onPhaseChange]);

  /**
   * The pair that decides whether a game is worth keeping.
   *
   * Measured 2026-09-07: `/fr/jeux/mercator` was the site's second entry point
   * — 13 arrivals — at a 10-second visit and an 86.7% exit rate. Nothing
   * recorded said whether the game failed to start on mobile or simply held
   * nobody, and repairing the wrong one of those was the risk. `sessionIndex`
   * is a dependency so a replay counts as a start: a reader who plays twice is
   * the strongest signal this surface can produce.
   */
  useEffect(() => {
    trackEvent("game:start", { game: game.id });
  }, [game.id, sessionIndex]);

  useEffect(() => {
    if (status !== "finished") return;
    trackEvent("game:complete", {
      game: game.id,
      correct: session.correctCount,
      rounds: sessionRounds.length,
    });
  }, [status, game.id, session.correctCount, sessionRounds.length]);

  const factForReveal =
    facts.length > 0 && (session.currentIndex + 1) % FACT_EVERY === 0
      ? facts[Math.floor(session.currentIndex / FACT_EVERY) % facts.length]
      : null;

  return (
    <div
      data-testid="game-play-island"
      className={cn(
        ACCENT_BY_ACCESS_MODE.jeux,
        "flex flex-col gap-4",
        className
      )}
    >
      {status === "finished" || !currentRound ? (
        <GameScoreCard
          language={language}
          game={game}
          correct={session.correctCount}
          total={session.totalRounds}
          facts={facts}
          corpusLimited={corpusLimited}
          onPlayAgain={playAgain}
        />
      ) : (
        <>
          <QuizProgressDots
            current={session.currentIndex + 1}
            total={session.totalRounds}
            language={language}
          />
          {status === "answering" ? (
            isEstimateRound(currentRound) ? (
              // Keyed by the subject so the track resets between rounds: the
              // slider holds the reader's value in state, and a reused
              // instance would open the next round already answered.
              <EstimateSlider
                language={language}
                key={currentRound.subjectId}
                round={currentRound}
                onAnswer={session.answer}
              />
            ) : (
              <BinaryChoice
                language={language}
                round={currentRound}
                onAnswer={session.answer}
              />
            )
          ) : (
            <>
              <GameAnswerReveal
                language={language}
                round={currentRound}
                isCorrect={session.verdict ?? false}
                isLastRound={session.currentIndex + 1 >= session.totalRounds}
                answer={session.selectedAnswer}
                onNext={session.next}
              />
              {factForReveal ? (
                <ScaleFactCard language={language} fact={factForReveal} />
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
};
