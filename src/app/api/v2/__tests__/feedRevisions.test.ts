import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/feedRevisionsHandler", () => ({
  listFeedRevisionsHandler: vi.fn(),
}));

vi.mock("@/api/v2/services/feedRevisions", () => ({
  listFeedRevisions: vi.fn(),
  encodeCursor: vi.fn((pt: string, id: string) =>
    Buffer.from(`${pt}|${id}`).toString("base64url")
  ),
}));

vi.mock("@/lib/api/atomSerializer", () => ({
  buildAtomFeed: vi.fn(
    () =>
      '<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>'
  ),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers: init?.headers as Record<string, string> | undefined,
    });
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
  applyCorsHeaders: vi.fn((r: Response) => {
    r.headers.set("Access-Control-Allow-Origin", "*");
    return r;
  }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  listFeedRevisionsHandler,
  type FeedRevisionEnvelope,
} from "@/api/v2/handlers/feedRevisionsHandler";
import { listFeedRevisions } from "@/api/v2/services/feedRevisions";
import { buildAtomFeed } from "@/lib/api/atomSerializer";
import { GET, OPTIONS } from "../feed/revisions/route";

const FEED_ENVELOPE: FeedRevisionEnvelope = {
  data: [
    {
      entity_type: "people",
      entity_id: "PPL_YORUBA",
      slug: "ppl_yoruba",
      version: 3,
      published_at: "2026-05-21T12:00:00.000Z",
      pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/3",
      summary: "Demographics update",
    },
  ],
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "Africa History — africahistory.org",
    pagination: { limit: 20, next_cursor: null },
  },
  errors: [],
};

describe("GET /api/v2/feed/revisions (JSON)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with feed envelope on happy path", async () => {
    vi.mocked(listFeedRevisionsHandler).mockResolvedValue(FEED_ENVELOPE);

    const request = new NextRequest("http://localhost/api/v2/feed/revisions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.license).toBe("CC-BY-SA-4.0");
    expect(body.errors).toEqual([]);
    expect(listFeedRevisionsHandler).toHaveBeenCalledWith(
      20,
      undefined,
      undefined
    );
  });

  it("sets Cache-Control: s-maxage=60 on the response", async () => {
    vi.mocked(listFeedRevisionsHandler).mockResolvedValue(FEED_ENVELOPE);

    const request = new NextRequest("http://localhost/api/v2/feed/revisions");
    const response = await GET(request);

    expect(response.headers.get("Cache-Control")).toContain("s-maxage=60");
  });

  it("passes limit, since, cursor to the handler", async () => {
    vi.mocked(listFeedRevisionsHandler).mockResolvedValue(FEED_ENVELOPE);

    const request = new NextRequest(
      "http://localhost/api/v2/feed/revisions?limit=5&since=2026-05-01T00:00:00.000Z&cursor=dGVzdA"
    );
    await GET(request);

    expect(listFeedRevisionsHandler).toHaveBeenCalledWith(
      5,
      "2026-05-01T00:00:00.000Z",
      "dGVzdA"
    );
  });

  it("returns 400 when limit is out of range", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/feed/revisions?limit=999"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("limit");
    expect(listFeedRevisionsHandler).not.toHaveBeenCalled();
  });

  it("returns 400 when since is not a valid ISO 8601 date", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/feed/revisions?since=not-a-date"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("since");
    expect(listFeedRevisionsHandler).not.toHaveBeenCalled();
  });

  it("returns 400 when format is invalid", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/feed/revisions?format=rss"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("format");
  });

  it("returns 500 on handler error", async () => {
    vi.mocked(listFeedRevisionsHandler).mockRejectedValue(new Error("db down"));

    const request = new NextRequest("http://localhost/api/v2/feed/revisions");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });
});

describe("GET /api/v2/feed/revisions (Atom)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns Content-Type: application/atom+xml for format=atom", async () => {
    vi.mocked(listFeedRevisions).mockResolvedValue({
      items: FEED_ENVELOPE.data,
      next_cursor: null,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/feed/revisions?format=atom"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/atom+xml"
    );
  });

  it("sets Cache-Control: s-maxage=60 for Atom response", async () => {
    vi.mocked(listFeedRevisions).mockResolvedValue({
      items: FEED_ENVELOPE.data,
      next_cursor: null,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/feed/revisions?format=atom"
    );
    const response = await GET(request);

    expect(response.headers.get("Cache-Control")).toContain("s-maxage=60");
  });

  it("calls buildAtomFeed and returns its output", async () => {
    vi.mocked(listFeedRevisions).mockResolvedValue({
      items: FEED_ENVELOPE.data,
      next_cursor: null,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/feed/revisions?format=atom"
    );
    const response = await GET(request);
    const text = await response.text();

    expect(buildAtomFeed).toHaveBeenCalled();
    expect(text).toContain("<feed");
  });

  it("derives Atom <updated> from data, never from Date.now() (NFR32)", async () => {
    vi.mocked(listFeedRevisions).mockResolvedValue({
      items: FEED_ENVELOPE.data,
      next_cursor: null,
    });
    vi.mocked(buildAtomFeed).mockImplementation((_items, opts) => {
      // NFR32: updated must equal the most recent published_at, not now
      expect(opts.updated).toBe("2026-05-21T12:00:00.000Z");
      return "<feed/>";
    });

    const request = new NextRequest(
      "http://localhost/api/v2/feed/revisions?format=atom"
    );
    await GET(request);

    expect(buildAtomFeed).toHaveBeenCalled();
  });
});

describe("OPTIONS /api/v2/feed/revisions", () => {
  it("returns 204", () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
  });
});
