import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { getPeopleRoute } from "@/lib/routing";
import { FicheSnapshotView } from "../FicheSnapshotView";

describe("FicheSnapshotView", () => {
  // @req REQ-019
  it("names a country from the snapshot's own French name field", () => {
    render(
      <FicheSnapshotView
        kind="country"
        entityId="SEN"
        version={3}
        publishedAt="2026-01-04T00:00:00.000Z"
        confidence={null}
        snapshotData={{ name_fr: "Sénégal" }}
        doctrine={null}
        lang="fr"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Sénégal" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("country-snapshot-view")).toBeInTheDocument();
  });

  /**
   * A people's snapshot carries `nameMain`, a country's `name_fr`. Reading the
   * wrong one falls back to the raw identifier, which is how a pinned fiche
   * comes to be headed "PPL_YORUBA".
   */
  // @req REQ-019
  it("names a people from the snapshot's own main-name field", () => {
    render(
      <FicheSnapshotView
        kind="people"
        entityId="PPL_YORUBA"
        version={2}
        publishedAt={null}
        confidence={null}
        snapshotData={{ nameMain: "Yoruba" }}
        doctrine={null}
        lang="fr"
      />
    );

    expect(screen.getByRole("heading", { name: "Yoruba" })).toBeInTheDocument();
    expect(screen.getByTestId("people-snapshot-view")).toBeInTheDocument();
  });

  // @req REQ-019
  it("falls back to the identifier when the snapshot carries no name", () => {
    render(
      <FicheSnapshotView
        kind="languageFamily"
        entityId="FLG_BANTU"
        version={1}
        publishedAt={null}
        confidence={null}
        snapshotData={{}}
        doctrine={null}
        lang="fr"
      />
    );

    expect(
      screen.getByRole("heading", { name: "FLG_BANTU" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("family-snapshot-view")).toBeInTheDocument();
  });

  /** The way back out of an archived reading, and it must reach its own kind. */
  // @req REQ-019
  it("points the banner at the live fiche of the entity's own kind", () => {
    render(
      <FicheSnapshotView
        kind="people"
        entityId="PPL_YORUBA"
        version={2}
        publishedAt="2026-01-04T00:00:00.000Z"
        confidence={null}
        snapshotData={{ nameMain: "Yoruba" }}
        doctrine={null}
        lang="fr"
      />
    );

    expect(
      screen.getByRole("link", { name: /version vivante/i })
    ).toHaveAttribute("href", getPeopleRoute("fr", "PPL_YORUBA"));
  });

  // @req REQ-019
  it("states that the capture is frozen", () => {
    render(
      <FicheSnapshotView
        kind="country"
        entityId="SEN"
        version={7}
        publishedAt={null}
        confidence={null}
        snapshotData={{ name_fr: "Sénégal" }}
        doctrine={null}
        lang="fr"
      />
    );

    expect(
      screen.getByText(/capture archivée\s*\(v7\) et ne sera jamais modifié/i)
    ).toBeInTheDocument();
  });
});
