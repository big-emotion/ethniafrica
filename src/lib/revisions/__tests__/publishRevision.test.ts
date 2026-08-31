import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { logger } from "@/lib/api/logger";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { publishRevision } from "../publishRevision";

const DRAFT_ID = "11111111-1111-4111-8111-111111111111";
const REVISION_ID = "22222222-2222-4222-8222-222222222222";
const REASON =
  "Cette publication documente la validation éditoriale de la fiche.";

function makeRevision(
  entityType: "people" | "country" | "language_family" | "language",
  entityId: string
) {
  return {
    id: REVISION_ID,
    entity_type: entityType,
    entity_id: entityId,
    version: 7,
    snapshot_jsonb: { content: { nom: "Contenu figé" } },
  };
}

function makeClient(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc }, rpc };
}

describe("publishRevision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-016
  it("rejects an invalid draft UUID before creating an authenticated client", async () => {
    const result = await publishRevision("not-a-uuid", REASON);

    expect(result).toEqual({
      success: false,
      code: "invalid_draft_id",
      message: "Le brouillon à publier est invalide.",
    });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  // @req REQ-016
  it.each(["a".repeat(49), "a".repeat(501)])(
    "rejects a trimmed publication reason outside 50–500 characters",
    async (reason) => {
      const result = await publishRevision(DRAFT_ID, `  ${reason}  `);

      expect(result).toEqual({
        success: false,
        code: "invalid_reason",
        message:
          "Le motif de publication doit contenir entre 50 et 500 caractères.",
      });
      expect(createServerSupabaseClient).not.toHaveBeenCalled();
    }
  );

  // @req REQ-016
  it("publishes with the authenticated client and returns live and pinned people URLs", async () => {
    const { client, rpc } = makeClient({
      data: makeRevision("people", "PPL_YORUBA"),
      error: null,
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    const result = await publishRevision(DRAFT_ID, `  ${REASON}  `);

    expect(rpc).toHaveBeenCalledWith("publish_revision", {
      p_draft_id: DRAFT_ID,
      p_reason: REASON,
    });
    expect(result).toEqual({
      success: true,
      revisionId: REVISION_ID,
      version: 7,
      liveUrl: getPeopleRoute("fr", "PPL_YORUBA"),
      pinnedUrl: getPeopleRoute("fr", "PPL_YORUBA@v7"),
    });
    expect(result).not.toHaveProperty("snapshot_jsonb");
  });

  // @req REQ-016
  it.each([
    [
      "country" as const,
      "SEN",
      getCountryRoute("fr", "SEN"),
      getCountryRoute("fr", "SEN@v7"),
    ],
    [
      "language_family" as const,
      "FLG_ATLANTIC",
      getFamilyRoute("fr", "FLG_ATLANTIC"),
      getFamilyRoute("fr", "FLG_ATLANTIC@v7"),
    ],
  ])(
    "derives the supported %s fiche URLs from the RPC revision",
    async (entityType, entityId, liveUrl, pinnedUrl) => {
      const { client } = makeClient({
        data: makeRevision(entityType, entityId),
        error: null,
      });
      vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

      const result = await publishRevision(DRAFT_ID, REASON);

      expect(result).toMatchObject({
        success: true,
        liveUrl,
        pinnedUrl,
      });
    }
  );

  // @req REQ-016
  it("returns a committed language publication as successful without inventing a URL", async () => {
    const { client } = makeClient({
      data: makeRevision("language", "wol"),
      error: null,
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    const result = await publishRevision(DRAFT_ID, REASON);

    expect(result).toEqual({
      success: true,
      revisionId: REVISION_ID,
      version: 7,
      liveUrl: null,
      pinnedUrl: null,
    });
  });

  // @req REQ-016
  it("logs an RPC failure but returns stable feedback without database details", async () => {
    const databaseError = {
      code: "42501",
      message: "Only senior_editor and admin may publish revisions.",
    };
    const { client } = makeClient({ data: null, error: databaseError });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never);

    const result = await publishRevision(DRAFT_ID, REASON);

    expect(logger.error).toHaveBeenCalledWith(
      "Failed to publish revision",
      databaseError,
      { draftId: DRAFT_ID }
    );
    expect(result).toEqual({
      success: false,
      code: "publication_failed",
      message: "La publication a échoué. Veuillez réessayer.",
    });
    expect(JSON.stringify(result)).not.toContain("senior_editor");
  });

  // @req REQ-016
  it("logs an authenticated-client failure and returns the same stable feedback", async () => {
    const clientError = new Error("Missing authenticated session cookies");
    vi.mocked(createServerSupabaseClient).mockRejectedValue(clientError);

    const result = await publishRevision(DRAFT_ID, REASON);

    expect(logger.error).toHaveBeenCalledWith(
      "Failed to publish revision",
      clientError,
      { draftId: DRAFT_ID }
    );
    expect(result).toEqual({
      success: false,
      code: "publication_failed",
      message: "La publication a échoué. Veuillez réessayer.",
    });
  });
});
