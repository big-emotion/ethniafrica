import { afterEach, describe, expect, it } from "vitest";

import { handleAntibotChallenge } from "@/api/v2/handlers/antibot";

describe("handleAntibotChallenge bilingual errors", () => {
  afterEach(() => {
    delete process.env.ANTIBOT_HMAC_SECRET;
  });

  // @req REQ-140
  it("returns an English unavailable message for an English request", async () => {
    delete process.env.ANTIBOT_HMAC_SECRET;

    const result = await handleAntibotChallenge({}, "en");

    expect(result).toMatchObject({
      status: 503,
      body: {
        errors: [
          {
            code: "UNAVAILABLE",
            message:
              "Anti-bot verification is temporarily unavailable. Please try again later.",
          },
        ],
      },
    });
  });
});
