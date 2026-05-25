import type { PeopleCultureData } from "@/lib/peopleDataTransformer";

interface PeopleCultureGridProps {
  data: PeopleCultureData;
}

export function PeopleCultureGrid({ data }: PeopleCultureGridProps) {
  const hasContent =
    data.supremeDeity ||
    data.intermediates.length > 0 ||
    data.initiation ||
    data.femaleInitiation ||
    data.funerary ||
    data.symbols.length > 0 ||
    data.music ||
    data.gastronomy ||
    data.christianityPercentage != null ||
    data.islamPercentage != null ||
    data.syncretism;

  if (!hasContent) return null;

  const hasReligionData =
    data.christianityPercentage != null || data.islamPercentage != null;

  return (
    <div className="space-y-[14px]">
      {data.supremeDeity && (
        <div>
          <p className="people-section-label">Divinité suprême</p>
          <p className="people-section-body font-medium">{data.supremeDeity}</p>
        </div>
      )}

      {data.intermediates.length > 0 && (
        <div>
          <p className="people-section-label">Divinités intermédiaires</p>
          <div className="flex flex-wrap gap-[6px] mt-[4px]">
            {data.intermediates.map((d, i) => (
              <span key={i} className="people-tag">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.initiation && (
        <div>
          <p className="people-section-label">Initiation (hommes)</p>
          <p className="people-section-body">{data.initiation}</p>
        </div>
      )}

      {data.femaleInitiation && (
        <div>
          <p className="people-section-label">Initiation (femmes)</p>
          <p className="people-section-body">{data.femaleInitiation}</p>
        </div>
      )}

      {data.funerary && (
        <div>
          <p className="people-section-label">Rites funéraires</p>
          <p className="people-section-body">{data.funerary}</p>
        </div>
      )}

      {data.symbols.length > 0 && (
        <div>
          <p className="people-section-label">Symboles</p>
          <div className="flex flex-wrap gap-[6px] mt-[4px]">
            {data.symbols.map((s, i) => (
              <span key={i} className="people-tag">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.music && (
        <div>
          <p className="people-section-label">Musique & instruments</p>
          <p className="people-section-body">{data.music}</p>
        </div>
      )}

      {data.gastronomy && (
        <div>
          <p className="people-section-label">Gastronomie</p>
          <p className="people-section-body">{data.gastronomy}</p>
        </div>
      )}

      {hasReligionData && (
        <div>
          <p className="people-section-label">Spiritualité contemporaine</p>
          <div className="flex flex-wrap gap-[8px] mt-[4px]">
            {data.christianityPercentage != null && (
              <span className="people-tag">
                Christianisme {data.christianityPercentage} %
              </span>
            )}
            {data.islamPercentage != null && (
              <span className="people-tag">
                Islam {data.islamPercentage} %
              </span>
            )}
          </div>
          {data.syncretism && (
            <p className="people-section-body mt-[6px]">{data.syncretism}</p>
          )}
        </div>
      )}
    </div>
  );
}
