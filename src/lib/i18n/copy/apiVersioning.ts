import type { Language } from "@/types/shared";

// @req REQ-037
export const apiVersioningCopy = {
  fr: {
    responseHeadersErrorSuffix:
      ", y compris les erreurs — une 401 sur une clé refusée et une 429 de limitation de débit les portent aussi.",
  },
  en: {
    responseHeadersErrorSuffix:
      ", including errors — a 401 for a rejected key and a 429 for rate limiting carry them too.",
  },
} satisfies Record<Language, { responseHeadersErrorSuffix: string }>;
