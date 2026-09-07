import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFlagBySlug: vi.fn(),
  verifyReporterContact: vi.fn(),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/flags/FlagPublicStatus", () => ({
  FlagPublicStatus: () => <div>Status</div>,
}));

vi.mock("@/lib/supabase/queries/flags/getFlagBySlug", () => ({
  getFlagBySlug: mocks.getFlagBySlug,
  getContributorAttribution: () => "A reader",
}));

vi.mock("@/lib/flags/reporterContact", () => ({
  verifyReporterContact: mocks.verifyReporterContact,
}));

import SignalementPage from "@/app/[lang]/signalements/[slug]/page";
import VerifyReporterEmailPage from "@/app/[lang]/signalements/verifier/page";

describe("remaining bilingual public report pages", () => {
  beforeEach(() => {
    mocks.getFlagBySlug.mockResolvedValue({
      flag: {
        status: "open",
        moderator_notes: null,
        entity_type: "people",
        entity_id: "PPL_YORUBA",
        assertion_field_path: "overview",
        flag_kind: "missing-source",
        reason_text: "The source is missing.",
        counter_source_url: null,
        counter_source_citation: null,
        proposed_rewrite: null,
        created_at: "2026-09-01T12:00:00.000Z",
        resolved_at: null,
      },
      contributor: null,
      assertion: null,
    });
    mocks.verifyReporterContact.mockResolvedValue({
      status: "verified",
      publicSlug: "flag-123",
    });
  });

  // @req REQ-140
  // @req REQ-145
  it("renders report detail labels in English", async () => {
    render(
      await SignalementPage({
        params: Promise.resolve({ lang: "en", slug: "flag-123" }),
      })
    );

    expect(screen.getByRole("heading", { name: "Reported item" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Report details" })
    ).toBeTruthy();
    expect(screen.getByText("Missing source")).toBeTruthy();
    expect(screen.getByText(/Reported on/)).toBeTruthy();
  });

  // @req REQ-140
  // @req REQ-145
  it("renders the verification outcome in English", async () => {
    render(
      await VerifyReporterEmailPage({
        params: Promise.resolve({ lang: "en" }),
        searchParams: Promise.resolve({ token: "token" }),
      })
    );

    expect(
      screen.getByText(
        "You will receive a message as soon as moderation has decided on your report."
      )
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "View your report" })
    ).toHaveAttribute("href", "/en/reports/flag-123");
  });
});
