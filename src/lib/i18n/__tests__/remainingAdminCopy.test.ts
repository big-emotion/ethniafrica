import { describe, expect, it } from "vitest";

import { adminCopy } from "@/lib/i18n/copy/admin";
import { reportsCopy } from "@/lib/i18n/copy/reports";

describe("remaining bilingual administration copy", () => {
  // @req REQ-140
  // @req REQ-145
  it("provides English and French copy for every remaining staff surface", () => {
    expect(adminCopy.en.queue.title).toBe("Reports");
    expect(adminCopy.fr.queue.title).toBe("Signalements");
    expect(adminCopy.en.signIn.submit).toBe("Receive a sign-in link");
    expect(adminCopy.fr.signIn.submit).toBe("Recevoir un lien de connexion");
    expect(adminCopy.en.apiKeys.createTitle).toBe("Create a key");
    expect(adminCopy.fr.apiKeys.createTitle).toBe("Créer une clé");
  });

  // @req REQ-140
  // @req REQ-145
  it("provides English and French copy for public report outcomes", () => {
    expect(reportsCopy.en.detail.targetTitle).toBe("Reported item");
    expect(reportsCopy.fr.detail.targetTitle).toBe("Élément concerné");
    expect(reportsCopy.en.verification.verified.title).toBe(
      "Email address confirmed"
    );
    expect(reportsCopy.fr.verification.verified.title).toBe(
      "Adresse confirmée"
    );
  });
});
