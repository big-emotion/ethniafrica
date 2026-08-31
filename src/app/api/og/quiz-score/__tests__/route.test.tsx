import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageResponse } from "next/og";
import { GET } from "../route";

const { mockDescribeScope } = vi.hoisted(() => ({
  mockDescribeScope: vi.fn(),
}));

vi.mock("@/api/v2/handlers/quiz", () => ({
  describeScope: (...args: unknown[]) => mockDescribeScope(...args),
}));

vi.mock("next/og", () => ({
  ImageResponse: vi.fn(function ImageResponseMock() {
    return new Response("image", { status: 200 });
  }),
}));

function request(query: Record<string, string>) {
  const url = new URL("https://ethniafrica.example/api/og/quiz-score");
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url);
}

const validQuery = { pays: "GHA", correct: "6", total: "8" };

describe("quiz-score Open Graph image route (Epic 10, Story 10.10, ETNI-499, ETNI-1141, FR70)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDescribeScope.mockResolvedValue({
      kind: "country",
      entityId: "GHA",
      labelFr: "Ghana",
    });
  });

  // The share image used to 404 unless the build carried
  // NEXT_PUBLIC_FEATURE_QUIZ, so a shared score lost its card.
  // @req REQ-103 FR70
  it("renders the card whatever the environment says", async () => {
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;

    const response = await GET(request(validQuery));

    expect(response.status).not.toBe(404);
    expect(ImageResponse).toHaveBeenCalled();
  });

  // @req REQ-103 FR70
  it.each([
    [
      "forged correct exceeding total",
      { ...validQuery, correct: "47", total: "8" },
    ],
    ["total outside [5,10]", { ...validQuery, total: "11" }],
    ["a country code that is not alpha-3", { ...validQuery, pays: "GHANA" }],
  ])("404s on %s — absurd cards cannot render", async (_label, query) => {
    const response = await GET(request(query));

    expect(response.status).toBe(404);
    expect(ImageResponse).not.toHaveBeenCalled();
  });

  // @req REQ-103 FR70
  it("404s when the track names a country the corpus does not hold", async () => {
    // The caption is read from the corpus, never from the query string: a
    // label a stranger can set is a caption on an image carrying the site's
    // own type.
    mockDescribeScope.mockResolvedValue(null);

    const response = await GET(request({ ...validQuery, pays: "ZZZ" }));

    expect(response.status).toBe(404);
    expect(ImageResponse).not.toHaveBeenCalled();
  });

  // @req REQ-103 FR70
  it("renders a cacheable 1200x630 image for valid params", async () => {
    const response = await GET(request(validQuery));

    expect(response.status).toBe(200);
    expect(ImageResponse).toHaveBeenCalledOnce();
    expect(vi.mocked(ImageResponse).mock.calls[0][1]).toMatchObject({
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  });
});
