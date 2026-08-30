import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/flags", () => ({
  handleFlagCreate: vi.fn(),
  handleFlagList: vi.fn(),
}));

import { handleFlagCreate } from "@/api/v2/handlers/flags";
import { POST } from "@/app/api/v2/flags/route";

describe("POST /api/v2/flags client IP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-012
  it.each([
    ["absent", undefined],
    ["blank", "   "],
  ])(
    "passes x-real-ip to the handler when x-forwarded-for is %s",
    async (_case, forwardedFor) => {
      const body = {
        target_type: "people",
        target_id: "PPL_YORUBA",
        flag_kind: "inaccurate",
        reason_text: "The published figure needs a newer source.",
        turnstile_token: "turnstile-token",
      };
      vi.mocked(handleFlagCreate).mockResolvedValue({
        status: 201,
        body: {
          data: { id: "flag-1" },
          meta: {
            license: "CC-BY-SA-4.0",
            attribution: "EthniAfrica — ethniafrica.com",
          },
          errors: [],
        },
      } as never);
      const headers: Record<string, string> = {
        authorization: "Bearer access-token",
        "content-type": "application/json",
        "x-real-ip": " 198.51.100.7 ",
      };
      if (forwardedFor !== undefined) {
        headers["x-forwarded-for"] = forwardedFor;
      }

      await POST(
        new NextRequest("http://localhost/api/v2/flags", {
          method: "POST",
          body: JSON.stringify(body),
          headers,
        })
      );

      expect(handleFlagCreate).toHaveBeenCalledWith(body, {
        accessToken: "access-token",
        clientIp: "198.51.100.7",
      });
    }
  );
});
