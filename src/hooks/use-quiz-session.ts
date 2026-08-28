"use client";

import { useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import type { QuizSessionQuestionView } from "@/api/v2/schemas/quiz";
import {
  quizScopeKey,
  quizScopeSearchParams,
  QUIZ_SESSION_SIZE,
  type QuizScope,
} from "@/lib/quiz/quizScope";

export interface UseQuizSessionOptions {
  scope: QuizScope;
  count?: number;
}

export type QuizSessionStatus =
  | "loading"
  | "error"
  | "answering"
  | "revealed"
  | "finished";

export interface UseQuizSessionResult {
  status: QuizSessionStatus;
  questions: QuizSessionQuestionView[];
  currentQuestion: QuizSessionQuestionView | null;
  currentIndex: number;
  totalQuestions: number;
  selectedOption: number | null;
  verdict: boolean | null;
  correctCount: number;
  error: Error | null;
  selectAnswer: (optionIndex: number) => void;
  validate: () => void;
  next: () => void;
}

interface PlayState {
  phase: "answering" | "revealed" | "finished";
  index: number;
  selectedOption: number | null;
  results: boolean[];
}

type PlayAction =
  | { type: "SELECT"; optionIndex: number }
  | { type: "VALIDATE"; isCorrect: boolean }
  | { type: "NEXT"; totalQuestions: number };

const INITIAL_PLAY_STATE: PlayState = {
  phase: "answering",
  index: 0,
  selectedOption: null,
  results: [],
};

function playReducer(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case "SELECT":
      if (state.phase !== "answering") return state;
      return { ...state, selectedOption: action.optionIndex };
    case "VALIDATE":
      if (state.phase !== "answering" || state.selectedOption === null) {
        return state;
      }
      return {
        ...state,
        phase: "revealed",
        results: [...state.results, action.isCorrect],
      };
    case "NEXT": {
      if (state.phase !== "revealed") return state;
      const isLast = state.index + 1 >= action.totalQuestions;
      return {
        ...state,
        phase: isLast ? "finished" : "answering",
        index: isLast ? state.index : state.index + 1,
        selectedOption: null,
      };
    }
    default:
      return state;
  }
}

async function fetchQuizSession(
  options: UseQuizSessionOptions
): Promise<QuizSessionQuestionView[]> {
  const params = quizScopeSearchParams(options.scope);
  params.set("count", String(options.count ?? QUIZ_SESSION_SIZE));

  const res = await fetch(`/api/v2/quiz/session?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Quiz session request failed with status ${res.status}`);
  }

  const json = await res.json();
  return (json.data?.questions ?? []) as QuizSessionQuestionView[];
}

/**
 * Fetches one quiz session (single round-trip, FR67) and drives the
 * answering → revealed → finished play loop over the returned questions.
 * `refetchOnWindowFocus`/`refetchOnReconnect`/`retry` are disabled so the
 * cached session is never silently re-fetched mid-play.
 *
 * The questions arrive in the order the server laid them out — the games
 * charter's ascending difficulty ladder — and are played in that order. Nothing
 * here reshuffles them.
 */
// @req REQ-103
export function useQuizSession(
  options: UseQuizSessionOptions
): UseQuizSessionResult {
  const {
    data: questions,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["quiz-session", quizScopeKey(options.scope), options.count],
    queryFn: () => fetchQuizSession(options),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [play, dispatch] = useReducer(playReducer, INITIAL_PLAY_STATE);

  const resolvedQuestions = questions ?? [];
  const currentQuestion = resolvedQuestions[play.index] ?? null;

  function selectAnswer(optionIndex: number) {
    dispatch({ type: "SELECT", optionIndex });
  }

  function validate() {
    if (!currentQuestion || play.selectedOption === null) return;
    dispatch({
      type: "VALIDATE",
      isCorrect: play.selectedOption === currentQuestion.correctOption,
    });
  }

  function next() {
    dispatch({ type: "NEXT", totalQuestions: resolvedQuestions.length });
  }

  const status: QuizSessionStatus = isError
    ? "error"
    : isLoading
      ? "loading"
      : play.phase;

  return {
    status,
    questions: resolvedQuestions,
    currentQuestion,
    currentIndex: play.index,
    totalQuestions: resolvedQuestions.length,
    selectedOption: play.selectedOption,
    verdict: play.results[play.index] ?? null,
    correctCount: play.results.filter(Boolean).length,
    error: (error as Error | null) ?? null,
    selectAnswer,
    validate,
    next,
  };
}
