import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { __resetGraphToken } from "../graph";
import {
  sendFlagResolutionEmail,
  sendFlagVerificationEmail,
  type FlagResolutionStatus,
} from "../flagNotification";
import {
  buildFlagResolutionEmailEn,
  buildFlagVerificationEmailEn,
} from "../flagNotification.en";
import { frenchResidue, glossaryBreaches } from "@/test/englishBankParity";

/**
 * The French templates are private to the module that sends them, so the
 * only way to read what a French reader receives is to send it. The Graph
 * transport is mocked; the mail is read back off the sendMail call.
 */
function sentMail() {
  const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
    ([url]) => typeof url === "string" && url.includes("/sendMail")
  );
  if (!call) throw new Error("no sendMail call was made");
  const { message } = JSON.parse(call[1].body);
  return {
    subject: message.subject as string,
    text: message.body.content as string,
  };
}

const urlsIn = (text: string): string[] =>
  [...text.matchAll(/https?:\/\/\S+/g)].map((match) => match[0]).sort();

const recipient = { email: "reader@example.org" };
const SLUG = "ABC123DEFG";
const NOTES = "Source added, thank you.";

describe("the English flag e-mails", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    __resetGraphToken();
    process.env.GRAPH_TENANT_ID = "tenant-test";
    process.env.GRAPH_CLIENT_ID = "client-test";
    process.env.GRAPH_CLIENT_SECRET = "secret-test";
    process.env.MAIL_SENDER = "contact@ethniafrica.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ethniafrica.com";
    process.env.NEXT_PUBLIC_CANONICAL_DOMAIN = "ethniafrica.com";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: vi.fn().mockResolvedValue(""),
      json: vi
        .fn()
        .mockResolvedValue({ access_token: "tok-test", expires_in: 3600 }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  /**
   * Same placeholders, other words: the English mail must carry every link,
   * the slug and the moderator's note exactly where the French one does, and
   * nothing the French one does not.
   */
  // @req REQ-145
  it.each<FlagResolutionStatus>(["accepted", "rejected", "duplicate"])(
    "states the %s decision with the French mail's links, slug and notes",
    async (status) => {
      await sendFlagResolutionEmail(
        {
          public_slug: SLUG,
          status,
          moderator_notes: NOTES,
          target_type: "people",
          target_id: "PPL_YORUBA",
        },
        recipient
      );
      const french = sentMail();
      const links = urlsIn(french.text);
      const flagLink = links.find((url) => url.includes("/signalements/"));
      const ficheLink = links.find((url) => url.includes("/atlas/")) ?? null;

      const english = buildFlagResolutionEmailEn({
        publicSlug: SLUG,
        status,
        moderatorNotes: NOTES,
        flagLink,
        ficheLink,
      });

      expect(urlsIn(english.text)).toEqual(links);
      expect(english.subject).toContain(SLUG);
      expect(english.text).toContain(SLUG);
      expect(english.text).toContain(NOTES);
      expect(english.subject).not.toBe(french.subject);
      expect(frenchResidue(english.subject)).toBeNull();
      expect(frenchResidue(english.text)).toBeNull();
      expect(glossaryBreaches(english.text)).toEqual([]);
      expect(english.provenance).toBe("machine");
    }
  );

  // @req REQ-145
  it("omits the notes and fiche lines when there is nothing to put in them", () => {
    const english = buildFlagResolutionEmailEn({
      publicSlug: SLUG,
      status: "accepted",
      moderatorNotes: null,
      flagLink: "https://ethniafrica.com/en/signalements/ABC123DEFG",
      ficheLink: null,
    });

    expect(urlsIn(english.text)).toEqual([
      "https://ethniafrica.com/en/signalements/ABC123DEFG",
    ]);
    expect(english.text).not.toMatch(/notes/i);
    expect(english.text).not.toMatch(/fiche/i);
  });

  // @req REQ-145
  it("asks for the address to be confirmed with the French mail's two links", async () => {
    await sendFlagVerificationEmail({
      email: recipient.email,
      token: "tok/en+1",
      publicSlug: SLUG,
    });
    const french = sentMail();
    const links = urlsIn(french.text);
    expect(links).toHaveLength(2);

    const english = buildFlagVerificationEmailEn({
      flagLink: links.find((url) => !url.includes("verifier")),
      verificationLink: links.find((url) => url.includes("verifier")),
    });

    expect(urlsIn(english.text)).toEqual(links);
    expect(english.text).toContain("24 hours");
    expect(english.text).toContain("EthniAfrica");
    expect(english.subject).not.toBe(french.subject);
    expect(frenchResidue(english.subject)).toBeNull();
    expect(frenchResidue(english.text)).toBeNull();
    expect(glossaryBreaches(english.text)).toEqual([]);
    expect(english.provenance).toBe("machine");
  });
});
