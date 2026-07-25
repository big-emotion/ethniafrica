interface LegalSection {
  title: string;
  paragraphs: readonly string[];
}

export interface LegalDocumentContent {
  title: string;
  eyebrow: string;
  lastUpdated: string;
  introduction: string;
  sections: readonly LegalSection[];
}

interface LegalDocumentProps {
  document: LegalDocumentContent;
}

// @req REQ-088
export function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-5xl pb-16 pt-4 md:pb-24 md:pt-8">
      <header className="border-b border-afh-border pb-10 md:pb-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-afh-terracotta">
          {document.eyebrow}
        </p>
        <h1 className="mt-4 max-w-[18ch] text-4xl font-display font-bold leading-tight text-afh-text md:text-6xl">
          {document.title}
        </h1>
        <p className="mt-5 text-sm text-afh-text-muted">
          {document.lastUpdated}
        </p>
        <p className="mt-8 max-w-3xl text-lg leading-relaxed text-afh-text-soft md:text-xl">
          {document.introduction}
        </p>
      </header>

      <div className="divide-y divide-afh-border">
        {document.sections.map((section, index) => (
          <section
            key={section.title}
            className="grid gap-5 py-9 md:grid-cols-[4rem_minmax(0,1fr)] md:gap-8 md:py-12"
          >
            <span
              aria-hidden="true"
              className="font-display text-2xl font-bold text-afh-gold"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="text-2xl font-display font-bold text-afh-text md:text-3xl">
                {section.title}
              </h2>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-afh-text-soft">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
