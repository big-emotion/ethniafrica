import { describe, expect, it } from "vitest";

import { serializePublicContent } from "@/api/v2/serializers/public-content";

describe("serializePublicContent", () => {
  // @req REQ-096
  it("removes protected fields at every depth while retaining approved public content", () => {
    const rawContent = {
      id: "record-1",
      title: "Community oral history",
      publicSummary: "A public account approved by the community.",
      source: {
        title: "Community archive",
        url: "https://archive.example.org/catalogue/record-1",
        storagePath: "protected-records/record-1.wav",
        signedUrl: "https://storage.example.org/sign/record-1",
        consentEvidence: { formId: "consent-1" },
        consentDocument: "consent.pdf",
        contributorEmail: "contributor@example.org",
      },
      narrative: {
        publicExcerpt: "Approved extract.",
        restrictedTranscript: "Private oral history.",
        speakerIdentity: { legalName: "Private person" },
        attachments: [
          {
            name: "Approved photograph",
            storage_path: "protected-records/photo.jpg",
            signed_url: "https://storage.example.org/sign/photo",
          },
        ],
      },
    };

    expect(serializePublicContent(rawContent)).toEqual({
      id: "record-1",
      title: "Community oral history",
      publicSummary: "A public account approved by the community.",
      source: {
        title: "Community archive",
        url: "https://archive.example.org/catalogue/record-1",
      },
      narrative: {
        publicExcerpt: "Approved extract.",
        attachments: [{ name: "Approved photograph" }],
      },
    });
  });

  // @req REQ-096
  it("does not mutate the raw snapshot", () => {
    const rawContent = {
      source: { storagePath: "protected-records/source.pdf" },
      narrative: { restrictedTranscript: "Private" },
    };

    serializePublicContent(rawContent);

    expect(rawContent).toEqual({
      source: { storagePath: "protected-records/source.pdf" },
      narrative: { restrictedTranscript: "Private" },
    });
  });
});
