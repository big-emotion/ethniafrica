"use client";

import { useReducer } from "react";

import { isCorrectAnswer, type GameRound } from "@/lib/games/gameKinds";

export type GameSessionStatus = "answering" | "revealed" | "finished";

export interface UseGameSessionResult {
  status: GameSessionStatus;
  currentRound: GameRound | null;
  currentIndex: number;
  totalRounds: number;
  correctCount: number;
  selectedAnswer: number | string | null;
  verdict: boolean | null;
  answer: (value: number | string) => void;
  next: () => void;
  restart: () => void;
}

interface PlayState {
  phase: GameSessionStatus;
  index: number;
  answer: number | string | null;
  /** One entry per round already judged; the score is read from it, never stored. */
  results: boolean[];
}

type PlayAction =
  | { type: "ANSWER"; answer: number | string; isCorrect: boolean }
  | { type: "NEXT"; totalRounds: number }
  | { type: "RESTART" };

const INITIAL_PLAY_STATE: PlayState = {
  phase: "answering",
  index: 0,
  answer: null,
  results: [],
};

function playReducer(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case "ANSWER":
      if (state.phase !== "answering") return state;
      return {
        ...state,
        phase: "revealed",
        answer: action.answer,
        results: [...state.results, action.isCorrect],
      };
    case "NEXT": {
      if (state.phase !== "revealed") return state;
      const isLast = state.index + 1 >= action.totalRounds;
      return {
        ...state,
        phase: isLast ? "finished" : "answering",
        index: isLast ? state.index : state.index + 1,
        answer: null,
      };
    }
    case "RESTART":
      return INITIAL_PLAY_STATE;
    default:
      return state;
  }
}

/**
 * Drives one game session over rounds already resolved server-side (REQ-120).
 *
 * Unlike `useQuizSession` this hook never touches the network: the Jouer hub
 * has no `/api/v2/games/*` route, the page computes every round and hands them
 * down as props, so the whole loop is a reducer over an array.
 *
 * A session with no rounds is finished, not broken: the relations and
 * migrations games are capped by what the corpus holds, and saying so on the
 * score card is the intended end state rather than an empty screen.
 */
// @req REQ-120
export function useGameSession(rounds: GameRound[]): UseGameSessionResult {
  const [play, dispatch] = useReducer(playReducer, INITIAL_PLAY_STATE);

  const currentRound = rounds[play.index] ?? null;

  function answer(value: number | string) {
    if (!currentRound) return;
    dispatch({
      type: "ANSWER",
      answer: value,
      isCorrect: isCorrectAnswer(currentRound, value),
    });
  }

  function next() {
    dispatch({ type: "NEXT", totalRounds: rounds.length });
  }

  function restart() {
    dispatch({ type: "RESTART" });
  }

  return {
    status: rounds.length === 0 ? "finished" : play.phase,
    currentRound,
    currentIndex: play.index,
    totalRounds: rounds.length,
    correctCount: play.results.filter(Boolean).length,
    selectedAnswer: play.answer,
    verdict: play.results[play.index] ?? null,
    answer,
    next,
    restart,
  };
}
