import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));

import { sendFlagResolutionEmail } from "../flagNotification";

const contributor = { id: "user-1", email: "reader@example.org" };

/**
 * ETNI-73: the moderator side (Story 5.8, `handleFlagTransition`) already
 * has its own test suite for authorization and the state machine. These
 * assertions cover only what this module owns — building and best-effort
 * dispatching the resolution email.
 */
describe("sendFlagResolutionEmail", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ethniafrica.com";
    process.env.NEXT_PUBLIC_CANONICAL_DOMAIN = "ethniafrica.com";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(""),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  // @req REQ-015
  it("sends an accepted email with moderator notes and the fiche link", async () => {
    await sendFlagResolutionEmail(
      {
        public_slug: "ABC123DEFG",
        status: "accepted",
        moderator_notes: "Source ajoutée, merci.",
        target_type: "people",
        target_id: "PPL_YORUBA",
      },
      contributor
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(init.body);
    expect(body.to).toBe("reader@example.org");
    expect(body.subject).toBe("Votre signalement ABC123DEFG a été accepté");
    expect(body.text).toContain("Source ajoutée, merci.");
    expect(body.text).toContain(
      "https://ethniafrica.com/fr/signalements/ABC123DEFG"
    );
    expect(body.text).toContain(
      "https://ethniafrica.com/fr/atlas/peuples/PPL_YORUBA"
    );
    expect(mocks.loggerInfo).toHaveBeenCalled();
  });

  // @req REQ-015
  it("sends a rejected email with a neutral subject and the flag page link", async () => {
    await sendFlagResolutionEmail(
      {
        public_slug: "XYZ987WVUT",
        status: "rejected",
        moderator_notes: "Source insuffisante pour confirmer.",
        target_type: "country",
        target_id: "SEN",
      },
      contributor
    );

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.subject).toBe("Votre signalement XYZ987WVUT a été examiné");
    expect(body.text).toContain("Source insuffisante pour confirmer.");
    expect(body.text).toContain(
      "https://ethniafrica.com/fr/signalements/XYZ987WVUT"
    );
  });

  // @req REQ-015
  it("sends a duplicate email referencing the original flag", async () => {
    await sendFlagResolutionEmail(
      {
        public_slug: "DUP0000001",
        status: "duplicate",
        moderator_notes: "Doublon du signalement 0123456789.",
        target_type: "people",
        target_id: "PPL_AKAN",
      },
      contributor
    );

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.subject).toBe("Votre signalement DUP0000001 — doublon détecté");
    expect(body.text).toContain("Doublon du signalement 0123456789.");
  });

  // @req REQ-015
  it("sends no email when the contributor account was erased", async () => {
    await sendFlagResolutionEmail(
      {
        public_slug: "ABC123DEFG",
        status: "accepted",
        moderator_notes: null,
        target_type: "people",
        target_id: "PPL_YORUBA",
      },
      null
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  // @req REQ-015
  it("logs and reports to Sentry, without throwing, on an HTTP failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("internal error"),
    });

    await expect(
      sendFlagResolutionEmail(
        {
          public_slug: "ABC123DEFG",
          status: "accepted",
          moderator_notes: null,
          target_type: "people",
          target_id: "PPL_YORUBA",
        },
        contributor
      )
    ).resolves.toBeUndefined();

    expect(mocks.loggerError).toHaveBeenCalled();
    expect(mocks.captureException).toHaveBeenCalled();
  });

  // @req REQ-015
  it("logs and reports to Sentry, without throwing, when the transport throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      sendFlagResolutionEmail(
        {
          public_slug: "ABC123DEFG",
          status: "rejected",
          moderator_notes: null,
          target_type: null,
          target_id: null,
        },
        contributor
      )
    ).resolves.toBeUndefined();

    expect(mocks.loggerError).toHaveBeenCalled();
    expect(mocks.captureException).toHaveBeenCalled();
  });

  // @req REQ-015
  it("skips sending and logs a warning when no email transport is configured", async () => {
    delete process.env.RESEND_API_KEY;

    await sendFlagResolutionEmail(
      {
        public_slug: "ABC123DEFG",
        status: "accepted",
        moderator_notes: null,
        target_type: "people",
        target_id: "PPL_YORUBA",
      },
      contributor
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mocks.loggerWarn).toHaveBeenCalled();
  });
});
