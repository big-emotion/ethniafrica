import { FicheTile } from "@/components/fiche/FicheTile";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { ProseWithChip } from "@/components/people/ProseWithChip";
import type {
  ChronologyEtymology,
  ChronologyRegime,
  ChronologyStation,
} from "@/lib/fiche/chronology";
import { ficheCopy } from "@/lib/i18n/copy/fiche";
import type { Language } from "@/types/shared";

const REGIMES: readonly ChronologyRegime[] = ["polity", "colonial", "modern"];

export interface FicheChronologyChapterProps {
  stations: readonly ChronologyStation[];
  etymology?: ChronologyEtymology;
  /**
   * The anchor shared links to the retired "Le nom et son histoire" chapter
   * still point at. It lands on the etymology, where that chapter now opens.
   */
  etymologyAnchorId?: string;
  /** One note call per sourced field, keyed by the field a passage names. */
  notes?: Partial<Record<string, ParagraphNoteData>>;
  language: Language;
}

function stationDetail(station: ChronologyStation): string {
  return [
    ...station.passages.map((passage) => passage.text),
    ...(station.entities ?? []).flatMap((entity) => [
      entity.name,
      entity.role ?? "",
      ...(entity.centres ?? []),
    ]),
    ...(station.routes ?? []),
    ...(station.zones ?? []),
    ...(station.centres ?? []),
  ].join(" ");
}

/**
 * One history timeline for the people and the country records.
 *
 * A vertical line runs down the stations; each carries a dot and a rule inked
 * by its regime, and reads period, then title, then a two-line preview. The
 * preview is plain text, because a sourced paragraph cannot sit inside a
 * summary; so an opened station restates its passages in full, with their
 * note calls, and the preview steps aside rather than being read twice.
 */
// @req REQ-148 REQ-155
export function FicheChronologyChapter({
  stations,
  etymology,
  etymologyAnchorId,
  notes,
  language,
}: FicheChronologyChapterProps) {
  const copy = ficheCopy[language].chronology;
  const regimes = REGIMES.filter((regime) =>
    stations.some((station) => station.regime === regime)
  );

  return (
    <>
      {etymology ? (
        <div id={etymologyAnchorId} className="afh-chronology-lead">
          <FicheTile
            language={language}
            title={copy.etymology}
            closedFact={etymology.preview}
            detailText={[...etymology.passages, ...etymology.otherNames].join(
              " "
            )}
          >
            {etymology.passages.map((passage) => (
              <p key={passage} className="afh-tile-prose">
                {passage}
              </p>
            ))}
            {etymology.otherNames.length ? (
              <>
                <p className="afh-tile-term">{copy.otherNames}</p>
                <ul className="afh-pills">
                  {etymology.otherNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </FicheTile>
        </div>
      ) : null}

      {regimes.length ? (
        <ul className="afh-chronology-legend" data-chronology-legend="">
          {regimes.map((regime) => (
            <li key={regime} data-regime={regime}>
              {copy.regime[regime]}
            </li>
          ))}
        </ul>
      ) : null}

      <ol className="afh-chronology" aria-label={copy.label}>
        {stations.map((station) => (
          <li
            key={station.key}
            data-regime={station.regime}
            className="afh-chronology-station"
          >
            <FicheTile
              language={language}
              kicker={<span data-station-period="">{station.period}</span>}
              title={station.title}
              value={
                station.namesAtTheTime?.length ? (
                  <span className="afh-chronology-names">
                    {station.namesAtTheTime.map((name) => (
                      <span key={name} className="afh-chronology-name">
                        <span className="afh-chronology-name-term">
                          {copy.nameAtTheTime}
                        </span>{" "}
                        <span>{name}</span>
                      </span>
                    ))}
                  </span>
                ) : undefined
              }
              closedFact={station.preview ?? ""}
              detailText={stationDetail(station)}
              bodyRestatesPreview
            >
              {station.passages.map((passage, index) => (
                <div
                  key={`${passage.field ?? passage.label ?? "passage"}-${index}`}
                  className="afh-chronology-passage"
                >
                  {passage.label ? (
                    <p className="afh-tile-term">{passage.label}</p>
                  ) : null}
                  <ProseWithChip
                    language={language}
                    text={passage.text}
                    note={passage.field ? notes?.[passage.field] : undefined}
                    className="afh-tile-prose"
                  />
                </div>
              ))}
              {station.entities?.map((entity) => (
                <div key={entity.name} className="afh-chronology-passage">
                  <p className="afh-tile-term">{entity.name}</p>
                  {entity.role ? (
                    <p className="afh-tile-prose">{entity.role}</p>
                  ) : null}
                  {entity.centres?.length ? (
                    <p className="afh-chronology-centres">
                      {copy.centres} · {entity.centres.join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))}
              {station.routes?.length ? (
                <ul className="afh-chronology-routes">
                  {station.routes.map((route) => (
                    <li key={route}>{route}</li>
                  ))}
                </ul>
              ) : null}
              {station.zones?.length ? (
                <ul className="afh-pills">
                  {station.zones.map((zone) => (
                    <li key={zone}>{zone}</li>
                  ))}
                </ul>
              ) : null}
              {station.centres?.length ? (
                <p className="afh-chronology-centres">
                  {copy.centres} · {station.centres.join(" · ")}
                </p>
              ) : null}
            </FicheTile>
          </li>
        ))}
      </ol>
    </>
  );
}
