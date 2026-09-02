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
 *
 * It names the tier rather than stopping at « chaque source citée ». Citing
 * a source and weighing it are two different promises, and the second is
 * the one the atlas actually keeps: nothing is excluded for being weak,
 * everything carries an explicit tier (official / referenced / unverified).
 */
// @req REQ-113
export function TrustStrip({ language }: TrustStripProps) {
  return (
    <aside className="home-trust" data-testid="home-trust-strip">
      <p>
        Chaque source est citée avec son niveau de fiabilité, et les désaccords
        sont signalés.{" "}
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
          font-size: var(--home-text-trust-copy);
          color: var(--afh-text-soft);
          line-height: 1.6;
        }
        /* The underline is what makes this link a link. It sits inside a
           paragraph, so colour alone leaves it invisible to a reader who
           cannot tell the two inks apart — and Tailwind's preflight has
           already dropped the browser's default, so the offset below was
           offsetting an underline that was never drawn. */
        .home-trust a {
          color: var(--afh-text);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        /* Padding only — the phone's alignment is the site's, not the
           strip's (styles/mobile-text.css). */
        @media (max-width: 700px) {
          .home-trust { padding: 20px; }
        }
      `}</style>
    </aside>
  );
}
