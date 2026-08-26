import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGameSession } from "@/hooks/use-game-session";
import type { BinaryRound, GlobeTapRound } from "@/lib/games/gameKinds";

function binaryRound(subjectId: string, correctIndex: 0 | 1 = 0): BinaryRound {
  return {
    kind: "binary",
    gameId: "appellations",
    subjectId,
    promptFr: `Comment ${subjectId} se nomme-t-il`,
    reveal: {
      textFr: `Origine de l'exonyme de ${subjectId}.`,
      fieldPath: "content.appellations.originOfExonyms",
    },
    options: [{ labelFr: "Alpha" }, { labelFr: "Beta" }],
    correctIndex,
  };
}

function globeTapRound(correctCountryId: string): GlobeTapRound {
  return {
    kind: "globeTap",
    gameId: "royaumes",
    subjectId: "KGD_TEST",
    promptFr: "Sur quel pays ce royaume s'étendait-il",
    reveal: {
      textFr: "Le royaume couvrait ce territoire.",
      fieldPath: "kingdoms[0]",
    },
    choices: ["NGA", "ZAF"],
    correctCountryId,
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
  it("judges a globe round by country id rather than option index", () => {
    const { result } = renderHook(() => useGameSession([globeTapRound("ZAF")]));

    act(() => result.current.answer("ZAF"));

    expect(result.current.selectedAnswer).toBe("ZAF");
    expect(result.current.verdict).toBe(true);
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
