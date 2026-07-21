import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/revisionsHandler", () => ({
  listPeopleRevisionsHandler: vi.fn(),
  getPeopleRevisionSnapshotHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), {
      status: init?.status ?? 200,
    });
    response.headers.set("Access-Control-Allow-Origin", "*");
    if (init?.headers) {
      const headers = init.headers as Record<string, string>;
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
    }
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  listPeopleRevisionsHandler,
  getPeopleRevisionSnapshotHandler,
  type RevisionListEnvelope,
} from "@/api/v2/handlers/revisionsHandler";
import {
  GET as revisionsGet,
  OPTIONS as revisionsOptions,
} from "../peoples/[id]/revisions/route";
import { GET as snapshotGet } from "../peoples/[id]/versions/[n]/route";

const REVISION_ITEM = {
  version: 3,
  published_at: "2026-05-21T12:00:00.000Z",
  moderator_pseudonym: "mod-aaaabbbb",
  reason: "Demographics update",
  pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/3",
};

const REVISION_LIST_ENVELOPE: RevisionListEnvelope = {
  data: [REVISION_ITEM],
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "Africa History — africahistory.org",
    pagination: { limit: 20, next_cursor: null },
  },
  errors: [],
};

const SNAPSHOT_ENVELOPE = {
  data: { id: "PPL_YORUBA", name: "Yoruba", confidence: 0.92 },
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "Africa History — africahistory.org",
    confidence: 0.92,
    pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/3",
  },
  errors: [],
};

describe("GET /api/v2/peoples/[id]/revisions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with revision list envelope on happy path", async () => {
    vi.mocked(listPeopleRevisionsHandler).mockResolvedValue(
      REVISION_LIST_ENVELOPE
    );

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/revisions"
    );
    const response = await revisionsGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([REVISION_ITEM]);
    expect(body.meta.license).toBe("CC-BY-SA-4.0");
    expect(body.errors).toEqual([]);
    expect(listPeopleRevisionsHandler).toHaveBeenCalledWith(
      "PPL_YORUBA",
      20,
      undefined
    );
  });

  it("passes limit and cursor from query params to the handler", async () => {
    vi.mocked(listPeopleRevisionsHandler).mockResolvedValue(
      REVISION_LIST_ENVELOPE
    );

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/revisions?limit=5&cursor=10"
    );
    await revisionsGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA" }),
    });

    expect(listPeopleRevisionsHandler).toHaveBeenCalledWith(
      "PPL_YORUBA",
      5,
      10
    );
  });

  it("returns 400 for invalid people ID format", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/invalid-id/revisions"
    );
    const response = await revisionsGet(request, {
      params: Promise.resolve({ id: "invalid-id" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(listPeopleRevisionsHandler).not.toHaveBeenCalled();
  });

  it("returns 400 when limit is out of range", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/revisions?limit=999"
    );
    const response = await revisionsGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("limit");
  });

  it("returns 400 when cursor is not a positive integer", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/revisions?cursor=abc"
    );
    const response = await revisionsGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("cursor");
  });

  it("returns 500 on handler error", async () => {
    vi.mocked(listPeopleRevisionsHandler).mockRejectedValue(
      new Error("db down")
    );

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/revisions"
    );
    const response = await revisionsGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  it("OPTIONS returns 204", () => {
    const response = revisionsOptions();
    expect(response.status).toBe(204);
  });
});

describe("GET /api/v2/peoples/[id]/versions/[n]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with snapshot envelope and Cache-Control: s-maxage=31536000, immutable", async () => {
    vi.mocked(getPeopleRevisionSnapshotHandler).mockResolvedValue(
      SNAPSHOT_ENVELOPE
    );

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/versions/3"
    );
    const response = await snapshotGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA", n: "3" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "s-maxage=31536000, immutable"
    );
    expect(body.data).toEqual(SNAPSHOT_ENVELOPE.data);
    expect(body.meta.confidence).toBe(0.92);
    expect(body.meta.pinned_url).toBe("/api/v2/peoples/PPL_YORUBA/versions/3");
    expect(getPeopleRevisionSnapshotHandler).toHaveBeenCalledWith(
      "PPL_YORUBA",
      3
    );
  });

  it("returns 404 with NOT_FOUND error when snapshot does not exist", async () => {
    vi.mocked(getPeopleRevisionSnapshotHandler).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/versions/999"
    );
    const response = await snapshotGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA", n: "999" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.errors[0].code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid people ID format", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/bad-id/versions/1"
    );
    const response = await snapshotGet(request, {
      params: Promise.resolve({ id: "bad-id", n: "1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("id");
    expect(getPeopleRevisionSnapshotHandler).not.toHaveBeenCalled();
  });

  it("returns 400 when n is not a positive integer", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/versions/abc"
    );
    const response = await snapshotGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA", n: "abc" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(body.errors[0].field).toBe("n");
  });

  it("returns 400 when n is 0", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/versions/0"
    );
    const response = await snapshotGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA", n: "0" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].field).toBe("n");
  });

  it("returns 500 on handler error", async () => {
    vi.mocked(getPeopleRevisionSnapshotHandler).mockRejectedValue(
      new Error("db down")
    );

    const request = new NextRequest(
      "http://localhost/api/v2/peoples/PPL_YORUBA/versions/1"
    );
    const response = await snapshotGet(request, {
      params: Promise.resolve({ id: "PPL_YORUBA", n: "1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });
});
