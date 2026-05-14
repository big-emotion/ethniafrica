import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DoctrineLinkCard } from "../DoctrineLinkCard";

describe("DoctrineLinkCard", () => {
  describe("French explanatory copy per slug", () => {
    it("renders endonymes-vs-exonymes copy", () => {
      render(<DoctrineLinkCard slug="endonymes-vs-exonymes" />);
      expect(
        screen.getByText(/endonymes \(auto-désignations\) et exonymes/i)
      ).toBeInTheDocument();
    });

    it("renders classifications-contestees copy", () => {
      render(<DoctrineLinkCard slug="classifications-contestees" />);
      expect(
        screen.getByText(/classification fait l'objet de débats académiques/i)
      ).toBeInTheDocument();
    });

    it("renders heritage-colonial copy", () => {
      render(<DoctrineLinkCard slug="heritage-colonial" />);
      expect(
        screen.getByText(/terme provient de l'héritage colonial/i)
      ).toBeInTheDocument();
    });

    it("renders topics-sensibles copy", () => {
      render(<DoctrineLinkCard slug="topics-sensibles" />);
      expect(
        screen.getByText(/sujet est sensible\. Notre doctrine éditoriale/i)
      ).toBeInTheDocument();
    });
  });

  describe("Live (no version) link target", () => {
    it("renders /fr/doctrine/<slug> link when version is undefined", () => {
      render(<DoctrineLinkCard slug="endonymes-vs-exonymes" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/fr/doctrine/endonymes-vs-exonymes"
      );
    });

    it("renders the historical note when version is undefined", () => {
      render(<DoctrineLinkCard slug="heritage-colonial" />);
      expect(
        screen.getByText(
          /version en vigueur au moment de la publication — historique disponible prochainement/i
        )
      ).toBeInTheDocument();
    });
  });

  describe("Pinned (with version) link target", () => {
    it("renders /fr/doctrine/<slug>@v1 link when version=1", () => {
      render(
        <DoctrineLinkCard slug="classifications-contestees" version={1} />
      );
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "href",
        "/fr/doctrine/classifications-contestees@v1"
      );
    });

    it("does NOT render the historical note when version is provided", () => {
      render(<DoctrineLinkCard slug="topics-sensibles" version={2} />);
      expect(
        screen.queryByText(/version en vigueur au moment de la publication/i)
      ).not.toBeInTheDocument();
    });
  });
});
