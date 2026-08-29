import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGameSession } from "@/hooks/use-game-session";
import type { BinaryRound } from "@/lib/games/gameKinds";
import { getCountryRoute } from "@/lib/routing";

function binaryRound(subjectId: string, correctIndex: 0 | 1 = 0): BinaryRound {
  return {
    kind: "binary",
    gameId: "mercator",
    subjectId,
    promptFr: `Lequel couvre la plus grande surface, ${subjectId}`,
    reveal: {
      textFr: `Surface réelle de ${subjectId}.`,
      fieldPath: "lib/atlas/assets/africaAdmin0",
      sources: [],
      confidence: null,
      ficheHref: getCountryRoute("fr", subjectId),
    },
    options: [{ labelFr: "Alpha" }, { labelFr: "Beta" }],
    correctIndex,
  };
}

describe("useGameSession (Jouer hub engine, REQ-120)", () => {
  // @req REQ-120
  it("opens on the first round in the answering phase", () => {
    const rounds = [binaryRound("PPL_A"), binaryRound("PPL_B")];
    const { result } = renderHook(() => useGameSession(rounds));

    expect(result.current.status).toBe("answering");
    expect(result.current.currentRound).toBe(rounds[0]);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalRounds).toBe(2);
    expect(result.current.selectedAnswer).toBeNull();
    expect(result.current.verdict).toBeNull();
  });

  // @req REQ-120
  it("resolves an empty round list to a finished session of zero rounds", () => {
    const { result } = renderHook(() => useGameSession([]));

    expect(result.current.status).toBe("finished");
    expect(result.current.totalRounds).toBe(0);
    expect(result.current.currentRound).toBeNull();
    expect(result.current.correctCount).toBe(0);
  });

  // @req REQ-120
  it("records the answer and reveals the round", () => {
    const { result } = renderHook(() =>
      useGameSession([binaryRound("PPL_A", 1)])
    );

    act(() => result.current.answer(1));

    expect(result.current.status).toBe("revealed");
    expect(result.current.selectedAnswer).toBe(1);
    expect(result.current.verdict).toBe(true);
    expect(result.current.correctCount).toBe(1);
  });

  // @req REQ-120
  it("marks a wrong answer without counting it", () => {
    const { result } = renderHook(() =>
      useGameSession([binaryRound("PPL_A", 1)])
    );

    act(() => result.current.answer(0));

    expect(result.current.verdict).toBe(false);
    expect(result.current.correctCount).toBe(0);
  });

  // @req REQ-120
  it("ignores a second answer once the round is revealed", () => {
    const { result } = renderHook(() =>
      useGameSession([binaryRound("PPL_A", 0)])
    );

    act(() => result.current.answer(0));
    act(() => result.current.answer(1));

    expect(result.current.selectedAnswer).toBe(0);
    expect(result.current.correctCount).toBe(1);
  });

  // @req REQ-120
  it("advances to the next round and clears the previous answer", () => {
    const rounds = [binaryRound("PPL_A"), binaryRound("PPL_B")];
    const { result } = renderHook(() => useGameSession(rounds));

    act(() => result.current.answer(0));
    act(() => result.current.next());

    expect(result.current.status).toBe("answering");
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentRound).toBe(rounds[1]);
    expect(result.current.selectedAnswer).toBeNull();
    expect(result.current.verdict).toBeNull();
  });

  // @req REQ-120
  it("ignores next while the reader is still answering", () => {
    const rounds = [binaryRound("PPL_A"), binaryRound("PPL_B")];
    const { result } = renderHook(() => useGameSession(rounds));

    act(() => result.current.next());

    expect(result.current.status).toBe("answering");
    expect(result.current.currentIndex).toBe(0);
  });

  // @req REQ-120
  it("finishes after the last round instead of advancing past it", () => {
    const { result } = renderHook(() => useGameSession([binaryRound("PPL_A")]));

    act(() => result.current.answer(0));
    act(() => result.current.next());

    expect(result.current.status).toBe("finished");
    expect(result.current.currentIndex).toBe(0);
  });

  // @req REQ-120
  it("derives the score from every round played", () => {
    const rounds = [
      binaryRound("PPL_A", 0),
      binaryRound("PPL_B", 1),
      binaryRound("PPL_C", 0),
    ];
    const { result } = renderHook(() => useGameSession(rounds));

    act(() => result.current.answer(0));
    act(() => result.current.next());
    act(() => result.current.answer(0));
    act(() => result.current.next());
    act(() => result.current.answer(0));

    expect(result.current.correctCount).toBe(2);
  });

  // @req REQ-120
  it("restarts on the first round with a cleared score", () => {
    const rounds = [binaryRound("PPL_A"), binaryRound("PPL_B")];
    const { result } = renderHook(() => useGameSession(rounds));

    act(() => result.current.answer(0));
    act(() => result.current.next());
    act(() => result.current.restart());

    expect(result.current.status).toBe("answering");
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.correctCount).toBe(0);
    expect(result.current.selectedAnswer).toBeNull();
  });
});
