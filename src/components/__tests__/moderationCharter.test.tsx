import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  within,
  waitFor,
  fireEvent,
} from "@testing-library/react";

import { FlagPublicStatus } from "@/components/flags/FlagPublicStatus";
import AdminContributionsPage from "@/app/admin/contributions/page";
import type { Contribution } from "@/lib/supabase/admin-queries";

const { pushMock, refreshMock, routerMock } = vi.hoisted(() => {
  const pushMock = vi.fn();
  const refreshMock = vi.fn();
  return {
    pushMock,
    refreshMock,
    routerMock: { push: pushMock, refresh: refreshMock },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

// Charter §3.2 — the transparency + moderation family (public reports queue
// /fr/signalements and the moderation workspace /admin/contributions) moves
// onto parchment (--afh-*) chrome tokens with density preserved. Status /
// classification / flag badges are the sanctioned semantic exception and
// must stay byte-identical — this file guards both halves of that contract.

const SRC_DIR = join(process.cwd(), "src");

function readSource(relativePath: string): string {
  return readFileSync(join(SRC_DIR, relativePath), "utf8");
}

// Raw Tailwind palette classes that must not appear in restyled chrome —
// every chrome color must resolve through an --afh-* token instead.
const RAW_PALETTE_CLASS =
  /\b(?:bg|text|border)-(?:red|green|gray|blue|yellow|indigo|purple|pink)-[0-9]{2,3}\b/;

const CHROME_FILES = [
  "app/admin/contributions/page.tsx",
  "components/flags/PublicFlagsQueue.tsx",
];

describe("moderation + transparency chrome tokenization (ETNI-805 · FR109 §3.2)", () => {
  describe.each(CHROME_FILES)("%s", (file) => {
    // @req REQ-091
    it("uses no raw Tailwind palette color class", () => {
      const source = readSource(file);
      const offenders = source
        .split("\n")
        .filter((line) => RAW_PALETTE_CLASS.test(line));
      expect(offenders).toEqual([]);
    });

    // @req REQ-091
    it("consumes at least one --afh-* charter token", () => {
      const source = readSource(file);
      expect(source).toMatch(/afh-/);
    });
  });

  describe("semantic status badges stay byte-identical (charter §3.2 exclusion)", () => {
    const EXPECTED_COLORS: Record<
      Contribution["status"] extends never ? never : string,
      { backgroundColor: string; color: string }
    > = {
      open: { backgroundColor: "#FEF3C7", color: "#92400E" },
      under_review: { backgroundColor: "#FEF3C7", color: "#92400E" },
      accepted: { backgroundColor: "#D1FAE5", color: "#065F46" },
      rejected: { backgroundColor: "#F3F4F6", color: "#374151" },
      duplicate: { backgroundColor: "#F3F4F6", color: "#374151" },
      withdrawn: { backgroundColor: "#F3F4F6", color: "#6B7280" },
    };

    it.each(
      Object.entries(EXPECTED_COLORS) as [
        keyof typeof EXPECTED_COLORS,
        { backgroundColor: string; color: string },
      ][]
    )(
      "status=%s keeps its exact computed color",
      // @req REQ-091
      (status, expected) => {
        const { unmount } = render(
          // @ts-expect-error — status union is narrowed by the six literal keys above
          <FlagPublicStatus status={status} />
        );
        const badge = screen.getByTestId("flag-status-badge");
        expect(badge.style.backgroundColor).toBe(expected.backgroundColor);
        expect(badge.style.color).toBe(expected.color);
        unmount();
      }
    );

    // @req REQ-091
    it("badge colors are not derived from any --afh-* chrome token", () => {
      const source = readSource("components/flags/FlagPublicStatus.tsx");
      const styleBlockMatch = source.match(/STATUS_CONFIG[\s\S]*?^};/m)?.[0];
      expect(styleBlockMatch).toBeDefined();
      expect(styleBlockMatch).not.toMatch(/var\(--afh-/);
    });
  });
});

const CONTRIBUTIONS: Contribution[] = [
  {
    id: "c1",
    type: "people",
    status: "pending",
    proposed_payload: { name: "Yoruba" },
    contributor_name: "Ama",
    notes: "Ajout de source",
    created_at: "2026-07-01T10:00:00.000Z",
    updated_at: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "c2",
    type: "country",
    status: "pending",
    proposed_payload: { name: "Kenya" },
    created_at: "2026-07-02T10:00:00.000Z",
    updated_at: "2026-07-02T10:00:00.000Z",
  },
];

function mockFetchJson(
  data: unknown,
  init: { ok?: boolean; status?: number } = {}
) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => data,
  } as Response;
}

describe("moderation workspace (/admin/contributions) — density, touch targets, confirmations", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue(mockFetchJson(CONTRIBUTIONS));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function renderPage() {
    render(<AdminContributionsPage />);
    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith("/api/admin/contributions");
      },
      { timeout: 3000 }
    );
    await waitFor(
      () => {
        expect(screen.getAllByRole("article").length).toBe(
          CONTRIBUTIONS.length
        );
      },
      { timeout: 3000 }
    );
  }

  // @req REQ-091
  it("renders one row per contribution without reducing density", async () => {
    await renderPage();
    const rows = screen.getAllByRole("article");
    expect(rows).toHaveLength(2);
  });

  // @req REQ-091
  it("gives Approve, Reject and Logout controls a >=44px hit area", async () => {
    await renderPage();
    const buttons = [
      ...screen.getAllByRole("button", { name: /approve/i }),
      ...screen.getAllByRole("button", { name: /reject/i }),
      screen.getByRole("button", { name: /logout/i }),
    ];
    for (const button of buttons) {
      expect(button.className).toMatch(/(?:^|\s)(?:min-)?h-11(?:\s|$)/);
    }
  });

  // @req REQ-091
  it("requires an explicit confirmation before approving (irreversible action)", async () => {
    await renderPage();

    const [approveButton] = screen.getAllByRole("button", { name: /approve/i });
    fireEvent.click(approveButton);

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/contributions/"),
      expect.anything()
    );

    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", {
      name: /confirm|approuver/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/contributions/c1",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  // @req REQ-091
  it("requires an explicit confirmation before rejecting (irreversible action)", async () => {
    await renderPage();

    const [rejectButton] = screen.getAllByRole("button", { name: /reject/i });
    fireEvent.click(rejectButton);

    const dialog = await screen.findByRole("alertdialog");
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/contributions/"),
      expect.anything()
    );

    const confirmButton = within(dialog).getByRole("button", {
      name: /confirm|rejeter/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/contributions/c1",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });
});
