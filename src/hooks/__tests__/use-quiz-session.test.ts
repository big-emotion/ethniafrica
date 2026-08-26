import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useQuizSession } from "../use-quiz-session";
import type { QuizSessionQuestionView } from "@/api/v2/schemas/quiz";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  }
  return Wrapper;
}

function makeQuestion(
  overrides: Partial<QuizSessionQuestionView> & { id: string }
): QuizSessionQuestionView {
  return {
    templateId: "T1",
    promptFr: `Question ${overrides.id}`,
    optionsFr: ["A", "B", "C", "D"],
    correctOption: 0,
    explanationFr: "Explication.",
    source: { title: "Source", year: 2020, tier: "official", url: null },
    assertionId: `assertion-${overrides.id}`,
    entity: {
      type: "people",
      id: "PPL_TEST",
      slug: "PPL_TEST",
      autonym: null,
      exonym: null,
    },
    ...overrides,
  };
}

const TWO_QUESTIONS: QuizSessionQuestionView[] = [
  makeQuestion({ id: "q1", correctOption: 0 }),
  makeQuestion({ id: "q2", correctOption: 2 }),
];

function mockFetchOnce(questions: QuizSessionQuestionView[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        data: { segment: "adults", difficulty: 2, questions },
        meta: {},
        errors: [],
      }),
  });
}

describe("useQuizSession (Epic 10, Story 10.9, ETNI-1132, FR67)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).fetch;
  });

  // @req REQ-103 FR67
  it("issues exactly one fetch on mount and never fetches again during play", async () => {
    const fetchMock = mockFetchOnce(TWO_QUESTIONS);
    global.fetch = fetchMock;

    const { result } = renderHook(
      () => useQuizSession({ segment: "adults", difficulty: 2, count: 8 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.status).toBe("answering"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => result.current.selectAnswer(0));
    act(() => result.current.validate());
    act(() => result.current.next());
    act(() => result.current.selectAnswer(2));
    act(() => result.current.validate());
    act(() => result.current.next());

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // @req REQ-103 FR67
  it("starts in the answering phase with the first question once loaded", async () => {
    global.fetch = mockFetchOnce(TWO_QUESTIONS);

    const { result } = renderHook(
      () => useQuizSession({ segment: "adults", difficulty: 2, count: 8 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.status).toBe("answering"));
    expect(result.current.currentQuestion?.promptFr).toBe("Question q1");
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalQuestions).toBe(2);
    expect(result.current.selectedOption).toBeNull();
  });

  // @req REQ-103 FR67
  it("moves to revealed with the computed verdict when validate is dispatched", async () => {
    global.fetch = mockFetchOnce(TWO_QUESTIONS);

    const { result } = renderHook(
      () => useQuizSession({ segment: "adults", difficulty: 2, count: 8 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.status).toBe("answering"));

    act(() => result.current.selectAnswer(0));
    act(() => result.current.validate());

    expect(result.current.status).toBe("revealed");
    expect(result.current.verdict).toBe(true);
  });

  // @req REQ-103 FR67
  it("computes an incorrect verdict when the selected option is wrong", async () => {
    global.fetch = mockFetchOnce(TWO_QUESTIONS);

    const { result } = renderHook(
      () => useQuizSession({ segment: "adults", difficulty: 2, count: 8 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.status).toBe("answering"));

    act(() => result.current.selectAnswer(1));
    act(() => result.current.validate());

    expect(result.current.status).toBe("revealed");
    expect(result.current.verdict).toBe(false);
  });

  // @req REQ-103 FR67
  it("does nothing when validate is dispatched without a selection", async () => {
    global.fetch = mockFetchOnce(TWO_QUESTIONS);

    const { result } = renderHook(
      () => useQuizSession({ segment: "adults", difficulty: 2, count: 8 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.status).toBe("answering"));

    act(() => result.current.validate());

    expect(result.current.status).toBe("answering");
  });

  // @req REQ-103 FR67
  it("returns to answering at index+1 when next is dispatched on a non-last question", async () => {
    global.fetch = mockFetchOnce(TWO_QUESTIONS);

    const { result } = renderHook(
      () => useQuizSession({ segment: "adults", difficulty: 2, count: 8 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.status).toBe("answering"));

    act(() => result.current.selectAnswer(0));
    act(() => result.current.validate());
    act(() => result.current.next());

    expect(result.current.status).toBe("answering");
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.selectedOption).toBeNull();
    expect(result.current.currentQuestion?.promptFr).toBe("Question q2");
  });

  // @req REQ-103 FR67
  it("moves to finished with the final score when next is dispatched on the last question", async () => {
    global.fetch = mockFetchOnce(TWO_QUESTIONS);

    const { result } = renderHook(
      () => useQuizSession({ segment: "adults", difficulty: 2, count: 8 }),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.status).toBe("answering"));

    act(() => result.current.selectAnswer(0));
    act(() => result.current.validate());
    act(() => result.current.next());

    act(() => result.current.selectAnswer(2));
    act(() => result.current.validate());
    act(() => result.current.next());

    expect(result.current.status).toBe("finished");
    expect(result.current.correctCount).toBe(2);
    expect(result.current.totalQuestions).toBe(2);
  });

  // @req REQ-103 FR67
  it("exposes an error status when the fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(
      () => useQuizSession({ segment: "adults", difficulty: 2, count: 8 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});
