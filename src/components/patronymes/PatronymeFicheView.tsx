import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { PatronymeNamingSystemSection } from "@/components/patronymes/PatronymeNamingSystemSection";
import { PatronymeOriginSection } from "@/components/patronymes/PatronymeOriginSection";
import { PatronymeFiliationSection } from "@/components/patronymes/PatronymeFiliationSection";
import { PatronymeAssociationsSection } from "@/components/patronymes/PatronymeAssociationsSection";
import { PatronymeBearersSection } from "@/components/patronymes/PatronymeBearersSection";

/**
 * The Record of a patronyme fiche: naming system (AC1), origin, filiation
 * (AC2), associations (AC4) and bearers (AC3/DEC-040), in the order a reader
 * meets a name's facts — what it is, where it comes from, who it is claimed
 * from, where it reaches, who is known to carry it.
 */
// @req REQ-133
export function PatronymeFicheView({
  patronyme,
}: {
  patronyme: PublicPatronyme;
}) {
  return (
    <div className="afh-parchment" id="fiche">
      <PatronymeNamingSystemSection patronyme={patronyme} />
      <PatronymeOriginSection patronyme={patronyme} />
      <PatronymeFiliationSection patronyme={patronyme} />
      <PatronymeAssociationsSection patronyme={patronyme} />
      <PatronymeBearersSection patronyme={patronyme} />
    </div>
  );
}

export default PatronymeFicheView;
