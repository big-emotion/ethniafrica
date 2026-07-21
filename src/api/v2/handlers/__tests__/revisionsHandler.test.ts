import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/revisions", () => ({
  listPeopleRevisions: vi.fn(),
  getPeopleRevisionSnapshot: vi.fn(),
}));

import {
  listPeopleRevisions,
  getPeopleRevisionSnapshot,
} from "../../services/revisions";
import {
  listPeopleRevisionsHandler,
  getPeopleRevisionSnapshotHandler,
} from "../revisionsHandler";

const ENTITY_ID = "PPL_YORUBA";

describe("listPeopleRevisionsHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the Module #0 envelope with cursor pagination meta", async () => {
    const items = [
      {
        version: 3,
        published_at: "2026-05-21T12:00:00.000Z",
        moderator_pseudonym: "mod-aaaabbbb",
        reason: "Demographics update",
        pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/3",
      },
    ];
    vi.mocked(listPeopleRevisions).mockResolvedValue({
      items,
      next_cursor: null,
    });

    const result = await listPeopleRevisionsHandler(ENTITY_ID, 20);

    expect(listPeopleRevisions).toHaveBeenCalledWith(ENTITY_ID, 20, undefined);
    expect(result).toEqual({
      data: items,
      meta: {
        license: "CC-BY-SA-4.0",
        attribution: "Africa History — africahistory.org",
        pagination: { limit: 20, next_cursor: null },
      },
      errors: [],
    });
  });

  it("propagates cursor to the service and includes next_cursor in meta", async () => {
    const items = [
      {
        version: 4,
        published_at: null,
        moderator_pseudonym: null,
        reason: null,
        pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/4",
      },
    ];
    vi.mocked(listPeopleRevisions).mockResolvedValue({
      items,
      next_cursor: 4,
    });

    const result = await listPeopleRevisionsHandler(ENTITY_ID, 1, 6);

    expect(listPeopleRevisions).toHaveBeenCalledWith(ENTITY_ID, 1, 6);
    expect(result.meta.pagination.next_cursor).toBe(4);
    expect(result.meta.pagination.limit).toBe(1);
  });

  it("returns empty data array with no next_cursor for an entity with no revisions", async () => {
    vi.mocked(listPeopleRevisions).mockResolvedValue({
      items: [],
      next_cursor: null,
    });

    const result = await listPeopleRevisionsHandler(ENTITY_ID, 20);

    expect(result.data).toEqual([]);
    expect(result.meta.pagination.next_cursor).toBeNull();
    expect(result.errors).toEqual([]);
  });
});

describe("getPeopleRevisionSnapshotHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the Module #0 envelope around the snapshot with confidence and pinned_url", async () => {
    const snapshot = {
      data: { id: "PPL_YORUBA", name: "Yoruba", confidence: 0.92 },
      version: 3,
      published_at: "2026-05-21T10:00:00.000Z",
      confidence: 0.92,
    };
    vi.mocked(getPeopleRevisionSnapshot).mockResolvedValue(snapshot);

    const result = await getPeopleRevisionSnapshotHandler(ENTITY_ID, 3);

    expect(getPeopleRevisionSnapshot).toHaveBeenCalledWith(ENTITY_ID, 3);
    expect(result).toEqual({
      data: snapshot.data,
      meta: {
        license: "CC-BY-SA-4.0",
        attribution: "Africa History — africahistory.org",
        confidence: 0.92,
        pinned_url: "/api/v2/peoples/PPL_YORUBA/versions/3",
      },
      errors: [],
    });
  });

  it("returns null when the snapshot is not found", async () => {
    vi.mocked(getPeopleRevisionSnapshot).mockResolvedValue(null);

    const result = await getPeopleRevisionSnapshotHandler(ENTITY_ID, 999);
    expect(result).toBeNull();
  });

  it("includes null confidence in meta when snapshot has no confidence", async () => {
    const snapshot = {
      data: { id: "PPL_YORUBA" },
      version: 1,
      published_at: null,
      confidence: null,
    };
    vi.mocked(getPeopleRevisionSnapshot).mockResolvedValue(snapshot);

    const result = await getPeopleRevisionSnapshotHandler(ENTITY_ID, 1);

    expect(result!.meta.confidence).toBeNull();
    expect(result!.meta.pinned_url).toBe(
      "/api/v2/peoples/PPL_YORUBA/versions/1"
    );
  });

  it("reads confidence from the snapshot, not the live entity", async () => {
    // Snapshot-isolation invariant: the confidence surfaced must be the value
    // stored in the snapshot at publication time.
    const snapshotWithStaleConfidence = {
      data: { id: "PPL_YORUBA", confidence: 0.42 },
      version: 2,
      published_at: "2026-01-01T00:00:00.000Z",
      confidence: 0.42,
    };
    vi.mocked(getPeopleRevisionSnapshot).mockResolvedValue(
      snapshotWithStaleConfidence
    );

    const result = await getPeopleRevisionSnapshotHandler(ENTITY_ID, 2);

    expect(result!.meta.confidence).toBe(0.42);
  });
});
