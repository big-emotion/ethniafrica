import Link from "next/link";

import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

export interface TrustStripProps {
  language: Language;
}

/**
 * The last thing the home says, and the only claim it makes about itself
 * (REQ-113): the corpus is sourced and its disagreements are marked. The
 * link is the receipt — a page that says its sources are cited and does
 * not say where to check is asking to be taken on trust.
 */
// @req REQ-113
export function TrustStrip({ language }: TrustStripProps) {
  return (
    <aside className="home-trust" data-testid="home-trust-strip">
      <p>
        Chaque source citée. Chaque débat signalé.{" "}
        <Link href={getLocalizedRoute(language, "doctrine")}>La doctrine</Link>.
      </p>

      <style>{`
        .home-trust {
          background: var(--afh-bg-warm);
          border-top: 1px solid var(--afh-border);
          padding: 22px 24px;
          text-align: center;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
        }
        .home-trust p {
          margin: 0 auto;
          max-width: 62ch;
          font-size: 13px;
          color: var(--afh-text-soft);
          line-height: 1.6;
        }
        .home-trust a {
          color: var(--afh-text);
          text-underline-offset: 2px;
        }
        @media (max-width: 700px) {
          .home-trust { text-align: left; padding: 20px; }
        }
      `}</style>
    </aside>
  );
}

export default TrustStrip;
