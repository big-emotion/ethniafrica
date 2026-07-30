import { describe, expect, it, vi } from "vitest";
import {
  issueProtectedAssetSignedUrl,
  type ProtectedAssetAccessClient,
} from "@/lib/rights/protected-asset-access";

const now = new Date("2026-07-29T12:00:00.000Z");

function createClient({
  role = "moderator",
  record = {},
}: {
  role?: string | null;
  record?: Record<string, unknown>;
} = {}) {
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://storage.example.test/signed-asset" },
    error: null,
  });
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  const storageFrom = vi.fn(() => ({ createSignedUrl }));

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data:
            table === "user_roles"
              ? role === null
                ? null
                : { role }
              : {
                  record_type: "reference_asset",
                  storage_bucket: "protected-records",
                  storage_path: "assets/interview.webm",
                  rights_basis: "documented consent",
                  consent_scope: "editorial",
                  consent_evidence: { recorded_at: "2026-01-01" },
                  visibility: "editorial",
                  embargo_until: null,
                  withdrawn_at: null,
                  community_review_status: "approved",
                  ...record,
                },
          error: null,
        }),
      })),
    })),
    insert,
  }));
  const client = {
    from,
    storage: { from: storageFrom },
  } as unknown as ProtectedAssetAccessClient;

  return { client, createSignedUrl, from, insert, storageFrom };
}

describe("issueProtectedAssetSignedUrl", () => {
  // @req REQ-096
  it("issues a five-minute URL for an authorized editor and an active protected asset", async () => {
    const { client, createSignedUrl, insert, storageFrom } = createClient();

    const signedUrl = await issueProtectedAssetSignedUrl({
      client,
      actorId: "editor-id",
      recordId: "record-id",
      now,
    });

    expect(signedUrl).toBe("https://storage.example.test/signed-asset");
    expect(storageFrom).toHaveBeenCalledWith("protected-records");
    expect(createSignedUrl).toHaveBeenCalledWith("assets/interview.webm", 300);
    expect(insert).toHaveBeenCalledWith({
      protected_record_id: "record-id",
      actor_id: "editor-id",
      action: "protected_record.access_authorized",
    });
  });

  const deniedCases: [
    string,
    { role?: string | null },
    Record<string, unknown>,
  ][] = [
    ["an unauthorised actor", { role: "contributor" }, {}],
    ["a missing role", { role: null }, {}],
    ["a non-asset protected record", {}, { record_type: "oral_narrative" }],
    ["missing rights", {}, { rights_basis: "" }],
    ["missing consent evidence", {}, { consent_evidence: {} }],
    ["recording-only consent", {}, { consent_scope: "recording" }],
    ["unapproved community review", {}, { community_review_status: "pending" }],
    ["an active embargo", {}, { embargo_until: "2026-07-30T12:00:00.000Z" }],
    ["a withdrawn record", {}, { withdrawn_at: "2026-07-28T12:00:00.000Z" }],
  ];

  // @req REQ-096
  it.each(deniedCases)("denies %s", async (_reason, roleInput, recordInput) => {
    const { client, createSignedUrl } = createClient({
      role: roleInput?.role,
      record: recordInput,
    });

    const signedUrl = await issueProtectedAssetSignedUrl({
      client,
      actorId: "actor-id",
      recordId: "record-id",
      now,
    });

    expect(signedUrl).toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  // @req REQ-096
  it("denies the request when a lookup or signing operation fails", async () => {
    const { client, createSignedUrl } = createClient();
    createSignedUrl.mockResolvedValueOnce({
      data: null,
      error: new Error("storage unavailable"),
    });

    const signedUrl = await issueProtectedAssetSignedUrl({
      client,
      actorId: "actor-id",
      recordId: "record-id",
      now,
    });

    expect(signedUrl).toBeNull();
  });

  // @req REQ-096
  it("denies the request when an authorization lookup throws", async () => {
    const { client, from } = createClient();
    from.mockImplementationOnce(() => {
      throw new Error("database unavailable");
    });

    await expect(
      issueProtectedAssetSignedUrl({
        client,
        actorId: "actor-id",
        recordId: "record-id",
        now,
      })
    ).resolves.toBeNull();
  });
});
