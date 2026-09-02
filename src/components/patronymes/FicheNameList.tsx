import Link from "next/link";

import type {
  PatronymeLinkSummary,
  PatronymeReachSummary,
} from "@/api/v2/services/patronymeFicheLinks";
import { getPatronymeRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;

/**
 * A run of names on a fiche's parchment, one per line.
 *
 * `afh-prose-list` is the parchment's own list dress, so the marker takes
 * `--accent-ink` from whichever surface the chapter is rendered under and no
 * accent is named here — a people fiche is ochre, a country fiche teal, and
 * this component learns neither (atlas charter §2).
 *
 * Each entry is one line at 430 px: the name, then what kind of naming fact it
 * is. The gloss sits one role below the name in the same line, the grammar the
 * autonym/exonym heading already uses, rather than on a second line — the
 * lists run to nine entries at most on the best-documented countries, and
 * eighteen lines of alternating weight would read as a table without being one.
 */
// @req REQ-133
export function FicheNameList({
  names,
}: {
  names: readonly (PatronymeLinkSummary | PatronymeReachSummary)[];
}) {
  return (
    <ul className="afh-prose-list">
      {names.map((name) => (
        <li key={name.id}>
          <Link
            href={getPatronymeRoute("fr", name.id)}
            className="font-semibold hover:underline"
            style={{ color: "var(--afh-text)" }}
          >
            {name.nameMain}
          </Link>{" "}
          <span className="text-afh-small">
            {t.nameSystemLabels[name.nameSystem]}
            {"viaPeoples" in name && name.viaPeoples.length > 0 ? (
              <>
                {" · "}
                {t.onFiche.reachViaPrefix}{" "}
                {name.viaPeoples.map((people) => people.nameMain).join(", ")}
              </>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
