import { describe, expect, it, vi } from "vitest";

const { getPatronymeByIdMock } = vi.hoisted(() => ({
  getPatronymeByIdMock: vi.fn(),
}));

vi.mock("@/api/v2/services/patronymes", () => ({
  getPatronymeById: getPatronymeByIdMock,
}));

import { isFicheKnownAbsent, loadPatronymeFiche } from "../ficheExistence";

/**
 * The three-state existence question, and why it may not be collapsed to two.
 *
 * `generateMetadata` is the only place early enough to still set a fiche
 * route's status, because `loading.tsx` makes the segment a Suspense boundary
 * and the shell — with its `200` — is flushed before the page body runs. The
 * same property is what makes a *rejection* there so costly: once the shell is
 * out, Next can no longer turn the failure into a status, so it drops the
 * resolved metadata instead and the document ends up with no `<title>` at all,
 * not even the one inherited from the root layout.
 *
 * That is a serious `document-title` violation on a page that otherwise
 * renders, and it is how four atlas routes failed the axe gate for hours while
 * the corpus was unreachable. So "the read failed" must answer this question
 * differently from "the fiche is not there".
 */
describe("isFicheKnownAbsent", () => {
  // @req REQ-019
  it("reports a fiche absent when the read succeeds and finds nothing", async () => {
    await expect(isFicheKnownAbsent(async () => null, "ZZZ")).resolves.toBe(
      true
    );
  });

  // @req REQ-019
  it("reports a fiche present when the read returns it", async () => {
    await expect(
      isFicheKnownAbsent(async () => ({ id: "SEN" }), "SEN")
    ).resolves.toBe(false);
  });

  // @req REQ-019
  it("does not report a fiche absent when the corpus read fails", async () => {
    const aborted = Object.assign(new Error("This operation was aborted"), {
      name: "AbortError",
    });

    await expect(
      isFicheKnownAbsent(() => Promise.reject(aborted), "SEN")
    ).resolves.toBe(false);
  });

  // @req REQ-019
  it("passes the id through to the loader", async () => {
    const load = vi.fn().mockResolvedValue({ id: "PPL_WOLOF" });

    await isFicheKnownAbsent(load, "PPL_WOLOF");

    expect(load).toHaveBeenCalledWith("PPL_WOLOF");
  });
});

describe("loadPatronymeFiche", () => {
  // Metadata, layout and page all need the same dossier. This shared loader is
  // the request-cache boundary that keeps those reads on one snapshot in RSC.
  // @req REQ-147
  it("loads the requested name dossier through the patronyme service", async () => {
    const patronyme = { id: "PAT_KEITA", content: {} };
    getPatronymeByIdMock.mockResolvedValue(patronyme);

    await expect(loadPatronymeFiche("PAT_KEITA")).resolves.toBe(patronyme);
    expect(getPatronymeByIdMock).toHaveBeenCalledWith("PAT_KEITA");
  });
});
