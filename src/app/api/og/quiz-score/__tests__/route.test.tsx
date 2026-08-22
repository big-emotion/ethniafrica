import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageResponse } from "next/og";
import { GET } from "../route";

const { mockIsQuizFeatureEnabled } = vi.hoisted(() => ({
  mockIsQuizFeatureEnabled: vi.fn(),
}));

vi.mock("next/og", () => ({
  ImageResponse: vi.fn(function ImageResponseMock() {
    return new Response("image", { status: 200 });
  }),
}));

vi.mock("@/lib/featureFlags", () => ({
  isQuizFeatureEnabled: () => mockIsQuizFeatureEnabled(),
}));

function request(query: Record<string, string>) {
  const url = new URL("https://ethniafrica.example/api/og/quiz-score");
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url);
}

const validQuery = { segment: "adults", correct: "6", total: "8", rung: "2" };

describe("quiz-score Open Graph image route (Epic 10, Story 10.10, ETNI-499, ETNI-1141, FR70)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsQuizFeatureEnabled.mockReturnValue(true);
  });

  // @req REQ-103 FR70
  it("404s when the quiz feature flag is off", async () => {
    mockIsQuizFeatureEnabled.mockReturnValue(false);

    const response = await GET(request(validQuery));

    expect(response.status).toBe(404);
    expect(ImageResponse).not.toHaveBeenCalled();
  });

  // @req REQ-103 FR70
  it.each([
    [
      "forged correct exceeding total",
      { ...validQuery, correct: "47", total: "8" },
    ],
    ["total outside [5,10]", { ...validQuery, total: "11" }],
    ["unknown segment", { ...validQuery, segment: "unknown" }],
  ])("404s on %s — absurd cards cannot render", async (_label, query) => {
    const response = await GET(request(query));

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
