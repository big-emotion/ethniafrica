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

import { __resetGraphToken } from "../graph";

import { sendFlagResolutionEmail } from "../flagNotification";

/**
 * Graph sends in two calls — the OAuth token, then the mail. These read the
 * second one and describe the mail as a recipient would see it, so the
 * assertions stay about the notification rather than about the wire format.
 */
function graphSendCall() {
  const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
    ([url]) => typeof url === "string" && url.includes("/sendMail")
  );
  if (!call) throw new Error("no sendMail call was made");
  return call;
}

function sentMail() {
  const [, init] = graphSendCall();
  const { message } = JSON.parse(init.body);
  return {
    to: message.toRecipients[0]?.emailAddress?.address,
    subject: message.subject,
    text: message.body.content,
  };
}

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
    __resetGraphToken();
    process.env.GRAPH_TENANT_ID = "tenant-test";
    process.env.GRAPH_CLIENT_ID = "client-test";
    process.env.GRAPH_CLIENT_SECRET = "secret-test";
    process.env.MAIL_SENDER = "contact@ethniafrica.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ethniafrica.com";
    process.env.NEXT_PUBLIC_CANONICAL_DOMAIN = "ethniafrica.com";
    // Graph is two calls: the token, then the send.
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

    const [url, init] = graphSendCall();
    expect(url).toBe(
      "https://graph.microsoft.com/v1.0/users/contact%40ethniafrica.com/sendMail"
    );
    expect(init.headers.Authorization).toBe("Bearer tok-test");
    const body = sentMail();
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

    const body = sentMail();
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

    const body = sentMail();
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
    delete process.env.MAIL_SENDER;

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
