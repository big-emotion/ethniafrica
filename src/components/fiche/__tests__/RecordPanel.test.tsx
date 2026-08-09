import { describe, expect, it, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

import { RecordPanel } from "../RecordPanel";

const SUMMARY_LABEL = "Lire le dossier complet";

function WrappedView() {
  return (
    <div data-testid="wrapped-view">
      <span data-testid="source-chip">
        UNFPA, World Population Prospects 2025
      </span>
      <span data-testid="confidence-chip">Confiance : élevée</span>
      <div data-testid="pinned-version-banner">Version figée · v3</div>
      <p id="record-anchor-target">Paragraphe cible du lien profond</p>
    </div>
  );
}

afterEach(() => {
  window.location.hash = "";
  cleanup();
});

describe("RecordPanel", () => {
  // @req REQ-091
  it("renders the wrapped child in the DOM output, not conditionally mounted behind JS", () => {
    render(
      <RecordPanel>
        <WrappedView />
      </RecordPanel>
    );

    expect(screen.getByTestId("wrapped-view")).toBeInTheDocument();
  });

  // @req REQ-091
  it("is present in server-rendered (SSR) HTML output before any hydration", () => {
    const html = renderToStaticMarkup(
      <RecordPanel>
        <WrappedView />
      </RecordPanel>
    );

    expect(html).toContain(SUMMARY_LABEL);
    expect(html).toContain("wrapped-view");
    expect(html).toContain("Paragraphe cible du lien profond");
  });

  // @req REQ-091
  it('renders a <details class="reading-gate"> closed by default with the summary label', () => {
    const { container } = render(
      <RecordPanel>
        <WrappedView />
      </RecordPanel>
    );

    const details = container.querySelector("details.reading-gate");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByText(SUMMARY_LABEL)).toBeInTheDocument();
  });

  // @req REQ-091
  it("opens natively when the summary is activated", () => {
    const { container } = render(
      <RecordPanel>
        <WrappedView />
      </RecordPanel>
    );

    const details = container.querySelector(
      "details.reading-gate"
    ) as HTMLDetailsElement;
    expect(details.open).toBe(false);

    fireEvent.click(screen.getByText(SUMMARY_LABEL));

    expect(details.open).toBe(true);
  });

  // @req REQ-091
  it("auto-opens the gate when the URL hash targets an anchor inside the record content", async () => {
    window.location.hash = "#record-anchor-target";

    const { container } = render(
      <RecordPanel>
        <WrappedView />
      </RecordPanel>
    );

    const details = container.querySelector(
      "details.reading-gate"
    ) as HTMLDetailsElement;

    await waitFor(() => expect(details.open).toBe(true));
  });

  // @req REQ-091
  it("leaves the gate closed when the URL hash does not match content inside the panel", async () => {
    window.location.hash = "#not-inside-the-record";

    const { container } = render(
      <RecordPanel>
        <WrappedView />
      </RecordPanel>
    );

    const details = container.querySelector(
      "details.reading-gate"
    ) as HTMLDetailsElement;

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(details.open).toBe(false);
  });

  // @req REQ-091
  it("preserves source chips, confidence and pinned-version banner verbatim inside the gate", () => {
    render(
      <RecordPanel>
        <WrappedView />
      </RecordPanel>
    );

    expect(screen.getByTestId("source-chip")).toBeInTheDocument();
    expect(screen.getByTestId("confidence-chip")).toBeInTheDocument();
    expect(screen.getByTestId("pinned-version-banner")).toBeInTheDocument();
  });
});
