import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";

describe("FieldProvenanceMarker (REQ-119)", () => {
  // @req REQ-119
  it("renders a visible missing marker for an empty structurally-expected field", () => {
    render(<FieldProvenanceMarker state="missing" />);

    expect(screen.getByText("Donnée manquante")).toBeInTheDocument();
  });

  // @req REQ-119
  it("names the origin when the value is derived", () => {
    render(
      <FieldProvenanceMarker
        state="derived"
        origin="peuples rattachés à la famille"
      />
    );

    expect(
      screen.getByText("Dérivée de : peuples rattachés à la famille")
    ).toBeInTheDocument();
  });

  // @req REQ-119
  it("renders no provenance marker for a declared value", () => {
    const { container } = render(<FieldProvenanceMarker state="declared" />);

    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-119
  it("prints the editor's own reason instead of the generic badge", () => {
    render(
      <FieldProvenanceMarker
        state="documented-gap"
        reason="Aucune alliance entre patronymes n'est documentée dans le passage."
      />
    );

    expect(
      screen.getByText(
        "Aucune alliance entre patronymes n'est documentée dans le passage."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Donnée manquante")).not.toBeInTheDocument();
  });

  // @req REQ-119
  it("keeps the generic badge when a gap carries no wording", () => {
    render(<FieldProvenanceMarker state="documented-gap" />);

    expect(screen.getByText("Donnée manquante")).toBeInTheDocument();
  });

  // @req REQ-119
  it("renders nothing for a field the class's model does not declare", () => {
    const { container } = render(
      <FieldProvenanceMarker state="not-modelled" />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
