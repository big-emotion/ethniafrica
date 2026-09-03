import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { POST } from "../route";

const validBody = {
  civility: "madame",
  firstName: "Aminata",
  lastName: "Diallo",
  email: "aminata@example.org",
  subject: "correction",
  message: "La fiche Peul cite une population de 1998, la source est datée.",
};

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** The one call the route makes to the world, and the only thing stubbed. */
function resendCall() {
  return (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
}

function sentPayload() {
  const [, init] = resendCall();
  return JSON.parse((init as RequestInit).body as string);
}

describe("POST /api/contact", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
  });

  // @req REQ-045
  it("accepts a complete message and reports it sent", async () => {
    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });

  // @req REQ-045
  it("delivers the message to the atlas's contact address", async () => {
    await POST(postRequest(validBody));

    expect(sentPayload().to).toBe("contact@ethniafrica.com");
  });

  /**
   * Without this the recipient can read a message and not answer it: the
   * sender's address is in the body, and the From is our own transport.
   */
  // @req REQ-045
  it("addresses the reply to the reader who wrote", async () => {
    await POST(postRequest(validBody));

    expect(sentPayload().reply_to).toBe("aminata@example.org");
  });

  // @req REQ-045
  it("puts the chosen subject in the mail's own subject line", async () => {
    await POST(postRequest(validBody));

    expect(sentPayload().subject).toContain(
      "Signaler une erreur ou une imprécision"
    );
  });

  // @req REQ-045
  it("carries the sender's identity and their words into the body", async () => {
    await POST(postRequest(validBody));

    const { text } = sentPayload();
    expect(text).toContain("Aminata");
    expect(text).toContain("Diallo");
    expect(text).toContain("aminata@example.org");
    expect(text).toContain("la source est datée");
  });

  // @req REQ-045
  it("refuses an incomplete message and names the fields at fault", async () => {
    const response = await POST(postRequest({ ...validBody, email: "nope" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fieldErrors).toHaveProperty("email");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * A bot that fills the hidden field is answered exactly as a reader is, so
   * it learns nothing — and nothing is mailed.
   */
  // @req REQ-045
  it("swallows a message whose hidden field was filled", async () => {
    const response = await POST(
      postRequest({ ...validBody, honeypot: "https://spam.example" })
    );

    expect(response.status).toBe(201);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // @req REQ-045
  it("refuses a body that is not JSON at all", async () => {
    const request = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  /**
   * The alternative — answering 201 with nothing sent — is the failure the
   * antibot secret already produced once: a green build over a dead form.
   */
  // @req REQ-045
  it("says the message did not leave when no transport is configured", async () => {
    delete process.env.RESEND_API_KEY;

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      contactEmail: "contact@ethniafrica.com",
    });
  });

  // @req REQ-045
  it("says the message did not leave when the transport refuses it", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "domain not verified",
    });

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(502);
  });
});
