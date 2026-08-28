import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchSnippet } from "../SearchSnippet";

describe("SearchSnippet", () => {
  // @req REQ-002
  it("marks each matched term so the reader sees why the row surfaced", () => {
    const { container } = render(
      <SearchSnippet snippet="Wollo ([[Bete]] Amhara), [[Bete]] Lasta" />
    );

    expect(container.querySelectorAll("mark")).toHaveLength(2);
  });

  // @req REQ-002
  it("shows markup arriving from the corpus as text, never as elements", () => {
    const { container } = render(
      <SearchSnippet snippet="avant [[<script>alert(1)</script>]] après" />
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  // @req REQ-002
  it("shows no delimiter character to the reader", () => {
    const { container } = render(<SearchSnippet snippet="le [[Bété]]" />);

    expect(container.textContent).toBe("le Bété");
    expect(screen.getByText("Bété").tagName).toBe("MARK");
  });

  // @req REQ-002
  it("renders nothing at all for an empty excerpt", () => {
    const { container } = render(<SearchSnippet snippet="" />);

    expect(container.firstChild).toBeNull();
  });
});
