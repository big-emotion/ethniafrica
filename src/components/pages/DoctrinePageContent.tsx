import { ChapterHeading } from "@/components/pages/ChapterHeading";
import { CLASSIFICATION_LABELS } from "@/lib/glossaire/vocabularies";
import { doctrineCopy } from "@/lib/i18n/copy/doctrine";
import type { Language } from "@/types/shared";

/**
 * /[lang]/doctrine content — editorial family (charter §4/§7, FR107).
 *
 * Each section keeps its `id="<status>"` anchor: ClassificationBadge links
 * to it (story ETNI-178 / 0.21, AR21, AR44). Gains chapter anatomy on every
 * classification section. No reading measure: the prose fills the page box it
 * shares with its title.
 *
 * Anchors:
 *   - #consensual
 *   - #contested
 *   - #colonial-legacy
 *   - #reconstructive
 */
const SECTIONS: Array<{
  id: keyof (typeof CLASSIFICATION_LABELS)["fr"];
}> = [
  { id: "consensual" },
  { id: "contested" },
  { id: "colonial-legacy" },
  { id: "reconstructive" },
];

// @req REQ-091
export default function DoctrinePageContent({
  language = "fr",
}: {
  language?: Language;
}) {
  const copy = doctrineCopy[language];
  return (
    <div className="mx-auto space-y-8 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-afh-h1 font-bold">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.intro}</p>
      </header>

      {SECTIONS.map((section, index) => {
        const labels = CLASSIFICATION_LABELS[language][section.id];
        return (
          <section
            key={section.id}
            id={section.id}
            className="space-y-2 scroll-mt-24"
          >
            <ChapterHeading
              stepLabel={`${String(index + 1).padStart(2, "0")} · ${copy.stepLabel}`}
              heading={labels.label}
            />
            <p className="text-afh-small italic text-muted-foreground">
              {labels.tooltip}
            </p>
            <p className="leading-relaxed">{copy.descriptions[section.id]}</p>
          </section>
        );
      })}
    </div>
  );
}
