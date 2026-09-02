import { CONTACT_EMAIL } from "@/lib/brand";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import {
  DID_YOU_KNOW_ENTITY_ACCENT,
  DID_YOU_KNOW_ENTITY_LABEL,
  DID_YOU_KNOW_TIER_LABEL,
} from "@/lib/home/didYouKnowPresentation";

interface ContactAsideProps {
  /** The fact drawn for this request, or null when the bank has none to give. */
  fact: DidYouKnowFact | null;
}

/**
 * What stands beside the contact form.
 *
 * The reference this page was drawn from puts a postal address, a map and
 * opening hours here. The atlas has none of those, and inventing them would
 * be the one thing a corpus about provenance may not do — so the column
 * carries the two that are true: the address a reader can write to directly,
 * and a fact from the "Saviez-vous" bank, drawn afresh on each load.
 *
 * It contributes **no heading**. The page's outline is its `h1` and the form's
 * one `h2`; a rubric label painted at 12 px and a fact headline painted at
 * `h3` would be two more `h2`s at two more sizes, which is the heading-against-
 * heading divergence `typography-charter.md` §3 calls a lie rather than a
 * choice. The fact files itself with the kicker brand charter §8.5 prescribes
 * for a band that is not allowed a title.
 *
 * The entity chips are labels, not links, for the same reason the wait screen
 * makes them labels: a reader who has typed half a message and follows a chip
 * loses what they wrote.
 */
// @req REQ-045
// @req REQ-113
export function ContactAside({ fact }: ContactAsideProps) {
  return (
    <aside className="space-y-8">
      <section className="space-y-2">
        <p className="text-afh-eyebrow font-semibold uppercase tracking-[0.16em] text-afh-text-soft">
          Adresse électronique
        </p>
        <p className="text-afh-body">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="text-afh-caption text-afh-text-soft">
          Le formulaire écrit à cette adresse. Nous répondons à celle que vous
          indiquez.
        </p>
      </section>

      {fact && (
        <section
          data-testid="contact-did-you-know"
          className="rounded-afh-lg border border-afh-border bg-afh-bg-warm p-5"
        >
          <p className="text-afh-small font-semibold uppercase tracking-[0.16em] text-afh-gold">
            Saviez-vous que
          </p>

          <p className="mt-3 font-display text-afh-h3 font-bold leading-tight text-afh-text">
            {fact.headline}
          </p>

          {fact.body.slice(0, 1).map((paragraph) => (
            <p
              key={paragraph.slice(0, 32)}
              className="mt-3 text-afh-small text-afh-text-soft"
            >
              {paragraph}
            </p>
          ))}

          {fact.entities.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {fact.entities.map((entity) => (
                <li
                  key={`${entity.kind}-${entity.id}`}
                  className={`${DID_YOU_KNOW_ENTITY_ACCENT[entity.kind]} inline-flex items-center gap-2 rounded-afh-full border border-[color:var(--accent)] bg-afh-surface px-3 py-1 text-afh-caption font-semibold text-[color:var(--accent-ink)]`}
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-afh-full bg-[color:var(--accent)]"
                  />
                  <span className="text-afh-eyebrow uppercase tracking-[0.07em] opacity-70">
                    {DID_YOU_KNOW_ENTITY_LABEL[entity.kind]}
                  </span>
                  {entity.label}
                </li>
              ))}
            </ul>
          )}

          {/* The tier travels with the claim wherever the claim goes — the
              same rule the fiches obey, and the reason this column may quote
              the bank at all. */}
          <p className="mt-4 border-t border-afh-border pt-3 text-afh-eyebrow uppercase tracking-[0.06em] text-afh-fg-muted">
            {DID_YOU_KNOW_TIER_LABEL[fact.tier]}
          </p>
        </section>
      )}
    </aside>
  );
}
