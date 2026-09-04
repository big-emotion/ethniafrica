import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loggerError: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mocks.loggerError },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));

import { __resetGraphToken, graphConfigured, sendViaGraph } from "../graph";

const TOKEN_URL =
  "https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token";
const SEND_URL =
  "https://graph.microsoft.com/v1.0/users/contact%40ethniafrica.com/sendMail";

function okToken(expiresIn = 3600) {
  return {
    ok: true,
    json: async () => ({ access_token: "tok-1", expires_in: expiresIn }),
    text: async () => "",
  } as unknown as Response;
}

function okSend() {
  return { ok: true, status: 202, text: async () => "" } as unknown as Response;
}

describe("Microsoft Graph mail transport", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    __resetGraphToken();
    process.env.GRAPH_TENANT_ID = "tenant-1";
    process.env.GRAPH_CLIENT_ID = "client-1";
    process.env.GRAPH_CLIENT_SECRET = "secret-1";
    process.env.MAIL_SENDER = "contact@ethniafrica.com";
    delete process.env.AZURE_TENANT_ID;
    delete process.env.MAIL_FROM_NAME;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  // The four variables are a set: three of them configured is not a transport,
  // and reporting it as one is how a send fails at the far end instead of at
  // the near one, where the caller can still tell the reader.
  // @req REQ-045
  it("is configured only when every credential is present", () => {
    expect(graphConfigured()).toBe(true);

    delete process.env.MAIL_SENDER;
    expect(graphConfigured()).toBe(false);
  });

  // The portal standardised on GRAPH_TENANT_ID and the agency site's first
  // env file used AZURE_TENANT_ID. A shared host sets one; both must read it.
  // @req REQ-045
  it("accepts AZURE_TENANT_ID as the tenant", () => {
    delete process.env.GRAPH_TENANT_ID;
    process.env.AZURE_TENANT_ID = "tenant-1";

    expect(graphConfigured()).toBe(true);
  });

  // @req REQ-045
  it("mints a token, then sends as the mailbox named in the URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okToken())
      .mockResolvedValueOnce(okSend());
    global.fetch = fetchMock as unknown as typeof fetch;

    const sent = await sendViaGraph({
      to: "reader@example.org",
      subject: "Sujet",
      text: "Corps",
    });

    expect(sent).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(TOKEN_URL);
    expect(fetchMock.mock.calls[1][0]).toBe(SEND_URL);

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    // Application permissions require From to equal the mailbox in the URL.
    // A mismatch is not a cosmetic difference: Graph rejects the send.
    expect(body.message.from.emailAddress.address).toBe(
      "contact@ethniafrica.com"
    );
    expect(body.message.toRecipients[0].emailAddress.address).toBe(
      "reader@example.org"
    );
    expect(body.saveToSentItems).toBe(false);
  });

  // Without this a recipient reads a reader's message and has no way to answer
  // it, because the From is always our own mailbox.
  // @req REQ-045
  it("carries replyTo so an answer reaches the person who wrote", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okToken())
      .mockResolvedValueOnce(okSend());
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendViaGraph({
      to: "contact@ethniafrica.com",
      subject: "Sujet",
      text: "Corps",
      replyTo: "reader@example.org",
    });

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.message.replyTo[0].emailAddress.address).toBe(
      "reader@example.org"
    );
  });

  // One app-only token serves every send until it nears expiry. Minting one per
  // mail is a second round trip on every send and a rate limit under load.
  // @req REQ-045
  it("reuses a live token across sends", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okToken())
      .mockResolvedValue(okSend());
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendViaGraph({ to: "a@example.org", subject: "s", text: "t" });
    await sendViaGraph({ to: "b@example.org", subject: "s", text: "t" });

    const tokenCalls = fetchMock.mock.calls.filter((c) => c[0] === TOKEN_URL);
    expect(tokenCalls).toHaveLength(1);
  });

  // A token about to expire must not be handed to an in-flight send.
  // @req REQ-045
  it("mints a fresh token when the cached one is near expiry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okToken(30))
      .mockResolvedValueOnce(okSend())
      .mockResolvedValueOnce(okToken(3600))
      .mockResolvedValueOnce(okSend());
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendViaGraph({ to: "a@example.org", subject: "s", text: "t" });
    await sendViaGraph({ to: "b@example.org", subject: "s", text: "t" });

    const tokenCalls = fetchMock.mock.calls.filter((c) => c[0] === TOKEN_URL);
    expect(tokenCalls).toHaveLength(2);
  });

  // The contract this repo's transport keeps, and the one place it differs from
  // the agency site's version: a send that fails must never throw into a flow
  // whose state has already committed. It reports false and is observed.
  // @req REQ-045
  it("returns false and reports when Graph refuses the send", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okToken())
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "ErrorAccessDenied",
      } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const sent = await sendViaGraph({
      to: "a@example.org",
      subject: "s",
      text: "t",
    });

    expect(sent).toBe(false);
    expect(mocks.loggerError).toHaveBeenCalled();
    expect(mocks.captureException).toHaveBeenCalled();
  });

  // @req REQ-045
  it("returns false when the token request itself fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "invalid_client",
    } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const sent = await sendViaGraph({
      to: "a@example.org",
      subject: "s",
      text: "t",
    });

    expect(sent).toBe(false);
    expect(mocks.captureException).toHaveBeenCalled();
    // No send was attempted with a token that was never issued.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // A failed token request must not be cached as a success for the next call.
  // @req REQ-045
  it("does not cache a token it failed to obtain", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "invalid_client",
      } as unknown as Response)
      .mockResolvedValueOnce(okToken())
      .mockResolvedValueOnce(okSend());
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendViaGraph({ to: "a@example.org", subject: "s", text: "t" });
    const sent = await sendViaGraph({
      to: "b@example.org",
      subject: "s",
      text: "t",
    });

    expect(sent).toBe(true);
  });
});
