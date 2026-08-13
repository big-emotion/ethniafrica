import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import axe from "axe-core";
import { CompareStickyBar } from "../CompareStickyBar";
import { EntityComparePicker } from "../EntityComparePicker";
import { CompareEntityHeader } from "../CompareEntityHeader";
import { ComparisonView } from "../ComparisonView";
import type { CompareCandidate } from "@/hooks/use-compare-selection";
import type { ComparisonColumn, ComparisonPageData } from "@/types/compare";

// axe-core is already a project dependency (used by scripts/a11y-test.ts via
// @axe-core/playwright); running it directly against the jsdom/happy-dom
// render output gives the same rule engine as vitest-axe without adding a
// new package that would need a package-lock.json update (ETNI-485).
async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container);
  const summary = results.violations.map(
    (violation) =>
      `[${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes
        .map((node) => node.target.join(" "))
        .join(", ")})`
  );
  expect(summary).toEqual([]);
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

const PEOPLES: CompareCandidate[] = [
  { id: "PPL_YORUBA", type: "peoples", exonym: "Yoruba", autonym: "Yorùbá" },
  { id: "PPL_ZULU", type: "peoples", exonym: "Zulu", autonym: "AmaZulu" },
  { id: "PPL_SHONA", type: "peoples", exonym: "Shona" },
  { id: "PPL_IGBO", type: "peoples", exonym: "Igbo" },
];

const COUNTRIES: CompareCandidate[] = [
  { id: "SEN", type: "countries", exonym: "Sénégal" },
];

const FAMILIES: CompareCandidate[] = [
  { id: "FLG_BANTU", type: "language-families", exonym: "Bantu" },
  { id: "FLG_MANDE", type: "language-families", exonym: "Mandé" },
];

const ALL_24_FAMILIES: CompareCandidate[] = Array.from(
  { length: 24 },
  (_, index) => ({
    id: "FLG_" + String(index).padStart(2, "0"),
    type: "language-families" as const,
    exonym: "Famille " + String(index).padStart(2, "0"),
  })
);

describe("CompareStickyBar", () => {
  // @req REQ-097
  it("shows the N/max count and disables comparer below the minimum", () => {
    const onCompare = vi.fn();
    render(<CompareStickyBar count={1} onCompare={onCompare} />);
    expect(screen.getByText("1/3 sélectionnés")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /comparer/i })).toBeDisabled();
  });

  // @req REQ-097
  it("enables comparer at 2 selections and calls onCompare when clicked", () => {
    const onCompare = vi.fn();
    render(<CompareStickyBar count={2} onCompare={onCompare} />);
    const button = screen.getByRole("button", { name: /comparer/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onCompare).toHaveBeenCalledTimes(1);
  });

  // @req REQ-097
  it("exposes a labelled region so it can be located regardless of DOM position", () => {
    render(<CompareStickyBar count={0} onCompare={vi.fn()} />);
    expect(
      screen.getByRole("region", { name: /sélection de comparaison/i })
    ).toBeInTheDocument();
  });
});

describe("EntityComparePicker", () => {
  let fetchSuggestions: (
    type: "peoples" | "countries",
    query: string
  ) => Promise<CompareCandidate[]>;
  let fetchLanguageFamilies: () => Promise<CompareCandidate[]>;

  beforeEach(() => {
    fetchSuggestions = vi.fn(async (type: "peoples" | "countries") =>
      type === "peoples" ? PEOPLES : COUNTRIES
    );
    fetchLanguageFamilies = vi.fn(async () => FAMILIES);
  });

  function renderPicker(
    onCompare = vi.fn(),
    overrides: {
      fetchLanguageFamilies?: () => Promise<CompareCandidate[]>;
    } = {}
  ) {
    return render(
      <EntityComparePicker
        onCompare={onCompare}
        fetchSuggestions={fetchSuggestions}
        fetchLanguageFamilies={
          overrides.fetchLanguageFamilies ?? fetchLanguageFamilies
        }
      />,
      { wrapper: createWrapper() }
    );
  }

  // @req REQ-097
  it("renders a labelled type radiogroup before the search combobox", () => {
    renderPicker();
    const radiogroup = screen.getByRole("radiogroup", {
      name: /type d.?entité/i,
    });
    expect(
      within(radiogroup).getByRole("radio", { name: /peuples/i })
    ).toBeInTheDocument();
    expect(
      within(radiogroup).getByRole("radio", { name: /pays/i })
    ).toBeInTheDocument();
    expect(
      within(radiogroup).getByRole("radio", {
        name: /familles linguistiques/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  // @req REQ-097
  it("fetches suggestions from /v2/search once ≥2 characters are typed", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "y" } });
    expect(fetchSuggestions).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "yo" } });
    await waitFor(() => expect(fetchSuggestions).toHaveBeenCalled());
    expect(fetchSuggestions).toHaveBeenCalledWith("peoples", "yo");
    expect(
      await screen.findByRole("option", { name: /yoruba/i })
    ).toBeInTheDocument();
  });

  // @req REQ-097
  it("renders the static family list without a search round-trip", async () => {
    renderPicker();
    fireEvent.click(
      screen.getByRole("radio", { name: /familles linguistiques/i })
    );
    expect(
      await screen.findByRole("option", { name: /bantu/i })
    ).toBeInTheDocument();

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "man" } });
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: /bantu/i })
      ).not.toBeInTheDocument()
    );
    expect(screen.getByRole("option", { name: /mandé/i })).toBeInTheDocument();
    // fetched once (not per keystroke) — the list is filtered client-side.
    expect(fetchLanguageFamilies).toHaveBeenCalledTimes(1);
  });

  // @req REQ-097
  it("renders all 24 FLG entries unfiltered — the family list is never truncated to the search suggestion cap", async () => {
    renderPicker(vi.fn(), {
      fetchLanguageFamilies: vi.fn(async () => ALL_24_FAMILIES),
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /familles linguistiques/i })
    );

    await screen.findByRole("option", { name: /famille 00/i });
    expect(screen.getAllByRole("option")).toHaveLength(24);
  });

  // @req REQ-097
  it("adds an entity via keyboard (ArrowDown + Enter) and announces it politely", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "yo" } });
    await screen.findByRole("option", { name: /yoruba/i });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(
      screen.getByRole("button", { name: /retirer yorùbá/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Yorùbá ajouté à la comparaison, 1 sur 3"
    );
  });

  // @req REQ-097
  it("closes the listbox on Escape", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "yo" } });
    await screen.findByRole("option", { name: /yoruba/i });

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: /yoruba/i })
      ).not.toBeInTheDocument()
    );
  });

  // @req REQ-097
  it("locks the type radiogroup once a first entity is selected", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "yo" } });
    const option = await screen.findByRole("option", { name: /yoruba/i });
    fireEvent.click(option);

    expect(screen.getByRole("radio", { name: /pays/i })).toBeDisabled();
    expect(
      screen.getByRole("radio", { name: /familles linguistiques/i })
    ).toBeDisabled();
    expect(screen.getByRole("radio", { name: /peuples/i })).toBeEnabled();
  });

  // @req REQ-097
  it("disables the combobox and explains the 3-maximum rule once full", async () => {
    renderPicker();
    const input = screen.getByRole("combobox");

    for (const candidate of PEOPLES.slice(0, 3)) {
      fireEvent.change(input, { target: { value: "yo" } });
      const option = await screen.findByRole("option", {
        name: new RegExp(candidate.exonym, "i"),
      });
      fireEvent.click(option);
    }

    expect(screen.getByText(/3 maximum/i)).toBeInTheDocument();
    expect(input).toBeDisabled();
  });
});

describe("CompareEntityHeader", () => {
  const highConfidenceColumn: ComparisonColumn = {
    id: "PPL_ILLUSTRATIVE_HIGH",
    label: "Peuple Illustratif Haut",
    type: "peuple",
    confidence: { score: 0.82, sourceCount: 5, lastHumanAuditAt: "2025-09-21" },
  };

  const lowConfidenceColumn: ComparisonColumn = {
    id: "PPL_ILLUSTRATIVE_LOW",
    label: "Peuple Illustratif Bas",
    type: "peuple",
    confidence: { score: 0.41, sourceCount: 2, lastHumanAuditAt: "2025-06-01" },
  };

  const unauditedColumn: ComparisonColumn = {
    id: "PPL_ILLUSTRATIVE_UNAUDITED",
    label: "Peuple Illustratif Non Audité",
    type: "peuple",
  };

  // @req REQ-097
  it("shows each entity's own confidence chip side by side with no comparative markup or copy", async () => {
    render(
      <>
        <CompareEntityHeader column={highConfidenceColumn} />
        <CompareEntityHeader column={lowConfidenceColumn} />
      </>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/82 % · 5 sources · vérifié 2025-09-21/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/41 % · 2 sources · vérifié 2025-06-01/)
      ).toBeInTheDocument();
    });

    const bodyText = document.body.textContent ?? "";
    expect(bodyText).not.toMatch(
      /plus (élevé|fiable)|meilleur|gagnant|top|highest|lowest|winner|ranking/i
    );
    expect(document.querySelector("[data-winner]")).toBeNull();
    expect(document.querySelectorAll('[class*="highlight"]')).toHaveLength(0);
  });

  // @req REQ-097
  it("shows the Epic 1 unaudited treatment when there is no confidence_scores row — the slot is never empty", () => {
    render(<CompareEntityHeader column={unauditedColumn} />);
    expect(screen.getByText(/fiche non auditée/i)).toBeInTheDocument();
  });

  // @req REQ-097
  it("opens the Epic 1 SourceChainSheet when the chip is activated", async () => {
    const user = userEvent.setup();
    render(<CompareEntityHeader column={highConfidenceColumn} />);

    const button = await screen.findByRole("button", {
      name: /confiance 82 %/i,
    });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Chaîne des sources")).toBeInTheDocument();
    });

    // Close the sheet so its focus trap / body-hide side effects don't leak
    // into subsequent tests that query the accessibility tree.
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByText("Chaîne des sources")).not.toBeInTheDocument();
    });
  });

  // @req REQ-097
  it("passes the entity label through to the chip's aria-label (Epic 1 contract)", async () => {
    render(<CompareEntityHeader column={highConfidenceColumn} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: new RegExp(`${highConfidenceColumn.label}$`),
        })
      ).toBeInTheDocument();
    });
  });

  // @req REQ-097
  it("renders a tertiary caption link to the confidence explainer", () => {
    render(<CompareEntityHeader column={highConfidenceColumn} />);

    const link = screen.getByRole("link", {
      name: /comment ce score est calculé/i,
    });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/fr/doctrine");
  });

  // @req REQ-097
  it("shows the ClassificationBadge above the fold when a status is present", () => {
    render(
      <CompareEntityHeader
        column={{ ...highConfidenceColumn, classificationStatus: "contested" }}
      />
    );
    expect(screen.getByTestId("classification-icon")).toBeInTheDocument();
  });

  // @req REQ-097
  it("renders no badge for the consensual/default classification status", () => {
    render(<CompareEntityHeader column={highConfidenceColumn} />);
    expect(screen.queryByTestId("classification-icon")).not.toBeInTheDocument();
  });
});

// ETNI-485 — axe-core assertions on the two comparator surfaces named by the
// story's technical notes (ComparisonView + picker), run test-first before
// wiring /fr/comparer into the a11y CI live-route list (scripts/a11y-test.ts).
describe("Accessibility (axe)", () => {
  const auditedComparison: ComparisonPageData = {
    type: "peuple",
    columns: [
      {
        id: "PPL_YORUBA",
        label: "Yoruba",
        type: "peuple",
        confidence: {
          score: 0.82,
          sourceCount: 5,
          lastHumanAuditAt: "2025-09-21",
        },
      },
      {
        id: "PPL_IGBO",
        label: "Igbo",
        type: "peuple",
        confidence: {
          score: 0.41,
          sourceCount: 2,
          lastHumanAuditAt: "2025-06-01",
        },
      },
    ],
    rows: [
      {
        key: "appellations",
        values: {
          PPL_YORUBA: { mainName: "Yoruba", selfAppellation: "Yoruba" },
          PPL_IGBO: { mainName: "Igbo" },
        },
      },
    ],
  };

  // Two unsourced columns rendered side by side — the regression case that
  // caught the landmark-unique violation (duplicate role="region"
  // aria-label="avertissement vérification" from UnauditedDisclaimer).
  const unauditedComparison: ComparisonPageData = {
    type: "peuple",
    columns: [
      { id: "PPL_SHONA", label: "Shona", type: "peuple" },
      { id: "PPL_ZULU", label: "Zulu", type: "peuple" },
    ],
    rows: [
      {
        key: "appellations",
        values: { PPL_SHONA: null, PPL_ZULU: null },
      },
    ],
  };

  // @req REQ-097
  it("ComparisonView has no axe violations with audited columns", async () => {
    const { container } = render(<ComparisonView data={auditedComparison} />);
    await expectNoAxeViolations(container);
  });

  // @req REQ-097
  it("ComparisonView has no axe violations with multiple unaudited columns (landmark-unique regression)", async () => {
    const { container } = render(<ComparisonView data={unauditedComparison} />);
    await expectNoAxeViolations(container);
  });

  // @req REQ-097
  it("EntityComparePicker has no axe violations", async () => {
    const { container } = render(
      <EntityComparePicker
        fetchSuggestions={async () => []}
        fetchLanguageFamilies={async () => []}
      />,
      { wrapper: createWrapper() }
    );
    await expectNoAxeViolations(container);
  });
});
