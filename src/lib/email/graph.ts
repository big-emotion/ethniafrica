import * as Sentry from "@sentry/nextjs";

import { logger } from "@/lib/api/logger";

/**
 * The one HTTP path this repository uses to send a mail: Microsoft Graph
 * `sendMail`, driven by an OAuth2 client-credentials app registration.
 *
 * It replaces Resend, and the reason is not preference. `ethniafrica.com`
 * needs a mailbox to *receive* on, and that mailbox lives in the Microsoft 365
 * tenant that already serves big-emotion.com. Keeping Resend for outbound
 * would have meant two providers, two sets of DNS authentication records —
 * a `send.` subdomain for Resend's SPF and DKIM alongside Microsoft's
 * `selector1`/`selector2` — and two independent ways for deliverability to
 * break quietly. Graph reuses the tenant app that already sends for
 * `big-emotion/website` and `big-emotion/b2b-space`, so one set of server
 * secrets covers three sites and the domain authenticates once.
 *
 * **Server-only.** `GRAPH_CLIENT_SECRET` must never reach a client bundle.
 *
 * One deliberate difference from the agency site's version of this module: it
 * throws, and this one does not. Flag notifications here are best-effort and
 * fire after a state transition has already committed, so a transport that
 * throws would turn a missed email into a failed moderation action. Every send
 * reports `true` or `false` and is observed through the logger and Sentry.
 */
export interface GraphMessage {
  to: string;
  subject: string;
  text: string;
  /**
   * Where an answer goes when it is not to us. The From is always the sending
   * mailbox, so without this a recipient can read a reader's message and have
   * no way to reply to whoever wrote it.
   */
  replyTo?: string;
  /**
   * The mailbox to send as, defaulting to `MAIL_SENDER`. It must be a real
   * mailbox in the tenant: with application permissions Graph requires the
   * `From` to equal the mailbox named in the request URL, so the two always
   * move together. This is why the address is a full one rather than the local
   * part the previous transport took — `notifications@` was a label there and
   * would have to be a provisioned mailbox here.
   */
  sender?: string;
  /** What the recipient sees before the address. Cosmetic. */
  fromName?: string;
}

/**
 * `big-emotion/b2b-space` standardised on `GRAPH_TENANT_ID`; the agency site's
 * first env file used `AZURE_TENANT_ID`. Accept either, so a host shared
 * between them can set one and every app reads it.
 */
function tenantId(): string | undefined {
  return process.env.GRAPH_TENANT_ID ?? process.env.AZURE_TENANT_ID;
}

/**
 * The four credentials are a set. Three of them is not a transport, and
 * treating it as one moves the failure from here — where the caller can still
 * tell the reader the message did not leave — to Microsoft's rejection.
 */
// @req REQ-015
// @req REQ-045
export function graphConfigured(): boolean {
  return Boolean(
    tenantId() &&
    process.env.GRAPH_CLIENT_ID &&
    process.env.GRAPH_CLIENT_SECRET &&
    process.env.MAIL_SENDER
  );
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

/**
 * One app-only token serves every send until it nears expiry. Module-scoped so
 * a warm instance reuses it rather than paying a second round trip per mail.
 */
let cachedToken: CachedToken | null = null;

/** Test seam: the cache outlives a single test otherwise. */
// @req REQ-015
// @req REQ-045
export function __resetGraphToken(): void {
  cachedToken = null;
}

async function accessToken(): Promise<string> {
  const tenant = tenantId();
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;

  if (!tenant || !clientId || !clientSecret) {
    throw new Error(
      "GRAPH_TENANT_ID (or AZURE_TENANT_ID), GRAPH_CLIENT_ID and GRAPH_CLIENT_SECRET must be set"
    );
  }

  // Refresh a minute before expiry so an in-flight send never races the
  // deadline and fails on a token that was valid when it was chosen.
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Graph token request failed with status ${response.status}: ${await response.text()}`
    );
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

/** True when the mail left, false when it did not — never a throw. */
// @req REQ-015
// @req REQ-045
export async function sendViaGraph(message: GraphMessage): Promise<boolean> {
  const sender = message.sender ?? process.env.MAIL_SENDER;
  if (!sender) {
    logger.error("Graph email send skipped: MAIL_SENDER is not set");
    return false;
  }

  const displayName = message.fromName ?? process.env.MAIL_FROM_NAME;

  try {
    const token = await accessToken();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: message.subject,
            body: { contentType: "Text", content: message.text },
            toRecipients: [{ emailAddress: { address: message.to } }],
            from: {
              emailAddress: displayName
                ? { address: sender, name: displayName }
                : { address: sender },
            },
            ...(message.replyTo
              ? { replyTo: [{ emailAddress: { address: message.replyTo } }] }
              : {}),
          },
          // Transactional mail has no reader in the sending mailbox's Sent
          // Items, and a contact mailbox is easier to read without them.
          saveToSentItems: false,
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      logger.error("Graph email send failed", undefined, {
        status: response.status,
        body,
      });
      Sentry.captureException(
        new Error(`Graph email send failed with status ${response.status}`)
      );
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Graph email send threw", error);
    Sentry.captureException(error);
    return false;
  }
}
