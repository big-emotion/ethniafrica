import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ApiDocsPage from "@/app/docs/api/page";
import ApiVersioningPage from "@/app/docs/api/versioning/page";

describe("the versioning strategy page", () => {
  // @req REQ-037
  it("names itself as the versioning policy", () => {
    render(<ApiVersioningPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /versionnement/i })
    ).toBeInTheDocument();
  });

  // @req REQ-037
  it("states that a major version is a path segment, and the only breaking change", () => {
    render(<ApiVersioningPage />);

    expect(screen.getAllByText("/api/v2").length).toBeGreaterThan(0);
    expect(screen.getByText("/api/v3")).toBeInTheDocument();
  });

  // @req REQ-037
  it("warns that new fields and endpoints ship without notice, so a client must tolerate them", () => {
    render(<ApiVersioningPage />);

    expect(
      screen.getByText(/tolérer les champs inconnus/i)
    ).toBeInTheDocument();
  });

  // @req REQ-037
  it("commits to at least six months between the deprecation and the sunset", () => {
    render(<ApiVersioningPage />);

    expect(screen.getAllByText(/six mois/i).length).toBeGreaterThan(0);
  });

  // @req REQ-037
  it.each(["X-API-Version", "X-API-Stable", "Deprecation", "Sunset", "Link"])(
    "documents the %s header",
    (header) => {
      render(<ApiVersioningPage />);

      const table = screen.getByRole("table", { name: /en-têtes/i });
      expect(
        within(table).getByRole("rowheader", { name: header })
      ).toBeInTheDocument();
    }
  );

  // @req REQ-037
  it("cites RFC 8594 as the standard the deprecation headers follow", () => {
    render(<ApiVersioningPage />);

    const rfc = screen.getByRole("link", { name: /RFC 8594/i });
    expect(rfc).toHaveAttribute(
      "href",
      "https://www.rfc-editor.org/rfc/rfc8594"
    );
  });

  // @req REQ-037
  it("leads back to the developer portal", () => {
    render(<ApiVersioningPage />);

    expect(
      screen.getByRole("link", { name: /documentation de l'api/i })
    ).toHaveAttribute("href", "/docs/api");
  });

  // The table and the example block are the two things that cannot shrink to
  // their container, so each scrolls in its own box rather than pushing the
  // page wide. Measured in a real browser at 320/430/720/1200 — happy-dom has
  // no layout, so what is pinned here is the structure that produced it.
  // @req REQ-037
  it("lets the header table scroll on its own rather than widening the page", () => {
    const { container } = render(<ApiVersioningPage />);

    const table = screen.getByRole("table", { name: /en-têtes/i });
    expect(table.closest(".overflow-x-auto")).not.toBeNull();
    expect(container.querySelector(".overflow-x-hidden")).toBeNull();
  });

  // @req REQ-037
  it("lets the example block scroll on its own", () => {
    const { container } = render(<ApiVersioningPage />);

    const example = container.querySelector("pre");
    expect(example?.closest(".overflow-x-auto")).not.toBeNull();
  });

  // Without min-w-0 a flex child refuses to shrink below its widest line, and
  // the example block's longest header pushed the whole page to 629px at a
  // 430px viewport — the scroll box around it cannot help while its own
  // column will not narrow.
  // @req REQ-037
  it("lets the text column beside each icon narrow below its content", () => {
    const { container } = render(<ApiVersioningPage />);

    const iconRows = [...container.querySelectorAll(".flex.items-start")];
    expect(iconRows.length).toBeGreaterThan(0);
    for (const row of iconRows) {
      expect(row.querySelector(".min-w-0")).not.toBeNull();
    }
  });
});

describe("the developer portal index", () => {
  // @req REQ-037
  it("leads to the versioning policy", () => {
    render(<ApiDocsPage />);

    expect(
      screen.getByRole("link", { name: /versionnement/i })
    ).toHaveAttribute("href", "/docs/api/versioning");
  });
});
