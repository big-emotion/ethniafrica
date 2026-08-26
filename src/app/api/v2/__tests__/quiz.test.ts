/**
 * Route-level tests for GET /api/v2/quiz/segments and
 * GET /api/v2/quiz/session (Epic 10, Story 10.7, ETNI-496).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  GET as segmentsGET,
  OPTIONS as segmentsOPTIONS,
} from "../quiz/segments/route";
import {
  GET as sessionGET,
  OPTIONS as sessionOPTIONS,
} from "../quiz/session/route";

vi.mock("@/api/v2/handlers/quiz", () => ({
  getQuizSegmentsHandler: vi.fn(),
  composeQuizSessionHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

vi.mock("@/lib/api/rate-limit", () => ({
  applyRateLimit: vi.fn().mockResolvedValue(null),
}));

import {
  getQuizSegmentsHandler,
  composeQuizSessionHandler,
} from "@/api/v2/handlers/quiz";
import { applyRateLimit } from "@/lib/api/rate-limit";

const segmentsEnvelope = {
  data: {
    segments: [
      {
        id: "children",
        labelFr: "enfants",
        rungs: [{ difficulty: 1, activeQuestionCount: 42 }],
      },
    ],
  },
  meta: { license: "CC-BY-SA-4.0", attribution: "Africa History" },
  errors: [],
};

describe("GET /api/v2/quiz/segments (route)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (applyRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  const segmentsRequest = () =>
    new NextRequest("http://localhost/api/v2/quiz/segments");

  // @req REQ-103
  it("happy path — 200 with the segments envelope", async () => {
    (getQuizSegmentsHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      segmentsEnvelope
    );

    const res = await segmentsGET(segmentsRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(segmentsEnvelope);
  });

  // @req REQ-103
  it("sets Cache-Control: s-maxage=3600", async () => {
    (getQuizSegmentsHandler as ReturnType<typeof vi.fn>).mockResolvedValue(
      segmentsEnvelope
    );

    const res = await segmentsGET(segmentsRequest());

    expect(res.headers.get("Cache-Control")).toBe("s-maxage=3600");
  });

  // @req REQ-103
  it("rate-limit 429 short-circuits before calling the handler", async () => {
    const rateLimited = new Response(
      JSON.stringify({ error: "rate_limited" }),
      { status: 429, headers: { "Retry-After": "30" } }
    );
    (applyRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(rateLimited);

    const res = await segmentsGET(segmentsRequest());

    expect(res.status).toBe(429);
    expect(getQuizSegmentsHandler).not.toHaveBeenCalled();
  });

  // @req REQ-103
  it("500 on handler error", async () => {
    (getQuizSegmentsHandler as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );

    const res = await segmentsGET(segmentsRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-103
  it("OPTIONS — 204", async () => {
    const res = segmentsOPTIONS();
    expect(res.status).toBe(204);
  });
});

const sessionEnvelope = {
  data: {
    segment: "adults",
    difficulty: 3,
    questions: [
      {
        id: "q-1",
        templateId: "T1",
        promptFr: "?",
        optionsFr: ["a", "b", "c", "d"],
        correctOption: 0,
        explanationFr: "expl",
        source: { title: "UN", year: 2021, tier: "official", url: null },
        assertionId: "assertion-1",
        entity: {
          type: "people",
          id: "PPL_A",
          slug: "PPL_A",
          autonym: "A",
          exonym: null,
        },
      },
    ],
  },
  meta: { license: "CC-BY-SA-4.0", attribution: "Africa History" },
  errors: [],
};

describe("GET /api/v2/quiz/session (route)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (applyRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  // @req REQ-103
  it("happy path — 200 with the session envelope", async () => {
    (composeQuizSessionHandler as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      envelope: sessionEnvelope,
    });

    const req = new NextRequest(
      "http://localhost/api/v2/quiz/session?segment=adults&difficulty=3&count=8"
    );
    const res = await sessionGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(sessionEnvelope);
    expect(composeQuizSessionHandler).toHaveBeenCalledWith({
      segment: "adults",
      difficulty: 3,
      count: 8,
    });
  });

  // @req REQ-103
  it("sets Cache-Control: no-store", async () => {
    (composeQuizSessionHandler as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      envelope: sessionEnvelope,
    });

    const req = new NextRequest(
      "http://localhost/api/v2/quiz/session?segment=adults&difficulty=3"
    );
    const res = await sessionGET(req);

    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  // @req REQ-103
  it("invalid segment — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/quiz/session?segment=babies&difficulty=1"
    );
    const res = await sessionGET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("segment");
    expect(composeQuizSessionHandler).not.toHaveBeenCalled();
  });

  // @req REQ-103
  it("count above range — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/quiz/session?segment=adults&difficulty=3&count=50"
    );
    const res = await sessionGET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("count");
  });

  // @req REQ-103
  it("missing segment — 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest(
      "http://localhost/api/v2/quiz/session?difficulty=3"
    );
    const res = await sessionGET(req);

    expect(res.status).toBe(400);
  });

  // @req REQ-103
  it("rung outside the segment's range — 422 SEMANTIC_ERROR", async () => {
    (composeQuizSessionHandler as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      code: "SEMANTIC_ERROR",
      message: "Difficulty 5 is outside the children segment's range",
    });

    const req = new NextRequest(
      "http://localhost/api/v2/quiz/session?segment=children&difficulty=5"
    );
    const res = await sessionGET(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.errors[0].code).toBe("SEMANTIC_ERROR");
  });

  // @req REQ-103
  it("rate-limit 429 short-circuits before parsing", async () => {
    const rateLimited = new Response(
      JSON.stringify({ error: "rate_limited" }),
      { status: 429, headers: { "Retry-After": "30" } }
    );
    (applyRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(rateLimited);

    const req = new NextRequest(
      "http://localhost/api/v2/quiz/session?segment=adults&difficulty=3"
    );
    const res = await sessionGET(req);

    expect(res.status).toBe(429);
    expect(composeQuizSessionHandler).not.toHaveBeenCalled();
  });

  // @req REQ-103
  it("500 on handler error", async () => {
    (composeQuizSessionHandler as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error")
    );

    const req = new NextRequest(
      "http://localhost/api/v2/quiz/session?segment=adults&difficulty=3"
    );
    const res = await sessionGET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-103
  it("OPTIONS — 204", async () => {
    const res = sessionOPTIONS();
    expect(res.status).toBe(204);
  });
});
