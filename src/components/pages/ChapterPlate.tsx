import Image from "next/image";

import type { PlateCopy } from "@/lib/i18n/copy/about";

export interface PlateSource {
  /** Matches the key its copy sits under. */
  id: string;
  src: string;
  width: number;
  height: number;
  /** The file's own page, so a reader can reach the original. */
  sourceHref: string;
  /** The licence's own address. Present only where attribution is required. */
  licenceHref?: string;
}

interface ChapterPlateProps {
  plate: PlateSource;
  copy: PlateCopy;
}

/**
 * A plate opening a chapter of an editorial page.
 *
 * **Contained, not full-bleed, and that is the assets talking.** These
 * engravings are 900 pixels wide; stretched across a desktop viewport they
 * would be soft, and a soft engraving argues nothing. Held at their own size
 * they read as plates in a book, which is the right idiom for a page that is
 * a document rather than a landing site.
 *
 * **The licence is published, not named.** Where a picture requires
 * attribution, the caption carries the author, the licence's own address and
 * a link to the file itself — not the licence's initials. A notice a reader
 * cannot reach is not a notice, and on this surface that distinction is the
 * whole product (brand charter §9).
 */
// @req REQ-132
export function ChapterPlate({ plate, copy }: ChapterPlateProps) {
  return (
    <figure className="mx-auto flex max-w-[56rem] flex-col items-center gap-afh-sm">
      <Image
        src={plate.src}
        alt={copy.alt}
        width={plate.width}
        height={plate.height}
        sizes="(min-width: 940px) 56rem, 100vw"
        className="h-auto w-full border border-afh-border"
      />
      <figcaption className="text-center text-afh-small leading-relaxed text-afh-text-soft">
        <span className="font-bold text-afh-text">{copy.caption}</span>{" "}
        <span data-testid={`plate-credit-${plate.id}`}>
          {copy.credit}{" "}
          {copy.licenceLabel && plate.licenceHref ? (
            <>
              <a
                href={plate.licenceHref}
                rel="license noreferrer"
                target="_blank"
                className="underline decoration-[var(--accent)] underline-offset-4"
              >
                {copy.licenceLabel}
              </a>
              {". "}
            </>
          ) : null}
          <a
            href={plate.sourceHref}
            rel="noreferrer"
            target="_blank"
            className="underline decoration-[var(--accent)] underline-offset-4"
          >
            {copy.sourceLabel}
          </a>
          .
        </span>
      </figcaption>
    </figure>
  );
}
