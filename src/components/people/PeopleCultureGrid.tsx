import type { PeopleCultureData } from "@/lib/peopleDataTransformer";
import { ProseWithChip } from "./ProseWithChip";
import type { CultureChips } from "./ProseWithChip";

interface PeopleCultureGridProps {
  data: PeopleCultureData;
  chips?: CultureChips;
}

export function PeopleCultureGrid({ data, chips }: PeopleCultureGridProps) {
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
          <ProseWithChip text={data.initiation} chip={chips?.initiation} />
        </div>
      )}

      {data.femaleInitiation && (
        <div>
          <p className="people-section-label">Initiation (femmes)</p>
          <ProseWithChip
            text={data.femaleInitiation}
            chip={chips?.femaleInitiation}
          />
        </div>
      )}

      {data.funerary && (
        <div>
          <p className="people-section-label">Rites funéraires</p>
          <ProseWithChip text={data.funerary} chip={chips?.funerary} />
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
          <ProseWithChip text={data.music} chip={chips?.music} />
        </div>
      )}

      {data.gastronomy && (
        <div>
          <p className="people-section-label">Gastronomie</p>
          <ProseWithChip text={data.gastronomy} chip={chips?.gastronomy} />
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
              <span className="people-tag">Islam {data.islamPercentage} %</span>
            )}
          </div>
          {data.syncretism && (
            <ProseWithChip
              text={data.syncretism}
              chip={chips?.syncretism}
              className="people-section-body mt-[6px]"
            />
          )}
        </div>
      )}
    </div>
  );
}
