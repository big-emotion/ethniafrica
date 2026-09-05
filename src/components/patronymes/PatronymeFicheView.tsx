import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import type { Language } from "@/types/shared";
import { PatronymeNamingSystemSection } from "@/components/patronymes/PatronymeNamingSystemSection";
import { PatronymeOriginSection } from "@/components/patronymes/PatronymeOriginSection";
import { PatronymeAssociationsSection } from "@/components/patronymes/PatronymeAssociationsSection";
import { PatronymeAlliancesSection } from "@/components/patronymes/PatronymeAlliancesSection";
import { PatronymeHomonymsSection } from "@/components/patronymes/PatronymeHomonymsSection";
import { PatronymeBearersSection } from "@/components/patronymes/PatronymeBearersSection";
import { PatronymeSourcesSection } from "@/components/patronymes/PatronymeSourcesSection";

/**
 * The parchment of a name fiche, in the order a reader meets a name's facts:
 * what it is, where it comes from, where it reaches, who it is allied with,
 * what else answers to the same string, who is known to carry it, and what
 * all of that rests on.
 *
 * Every chapter here is one the strict model declares, and every one is
 * printed whether or not the corpus fills it (atlas charter §4). Three of
 * them — alliances, homonyms, sources — had no section at all until now,
 * although the corpus carries sources on all 30 dossiers, and the filiation
 * section that stood here read `content.filiationClaims`, a key no model and
 * no dossier has ever had.
 *
 * Sources stays last: it is the footer the confidence chip's `#sources`
 * anchor points at, and that anchor was dead on every name fiche.
 */
// @req REQ-133
export function PatronymeFicheView({
  patronyme,
  language,
}: {
  patronyme: PublicPatronyme;
  language: Language;
}) {
  return (
    <div className="afh-parchment" id="fiche">
      <PatronymeNamingSystemSection patronyme={patronyme} language={language} />
      <PatronymeOriginSection patronyme={patronyme} language={language} />
      <PatronymeAssociationsSection patronyme={patronyme} language={language} />
      <PatronymeAlliancesSection patronyme={patronyme} language={language} />
      <PatronymeHomonymsSection patronyme={patronyme} language={language} />
      <PatronymeBearersSection patronyme={patronyme} language={language} />
      <PatronymeSourcesSection patronyme={patronyme} language={language} />
    </div>
  );
}
