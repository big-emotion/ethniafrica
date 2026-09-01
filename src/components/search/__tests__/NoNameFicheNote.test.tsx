import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoNameFicheNote } from "../NoNameFicheNote";

describe("NoNameFicheNote", () => {
  // @req REQ-135
  it("renders an explicit absence marker, not silence", () => {
    render(<NoNameFicheNote />);

    const note = screen.getByTestId("no-name-fiche-note");
    expect(note).toHaveAttribute("role", "status");
    expect(note).toHaveTextContent(/nom/i);
  });
});
