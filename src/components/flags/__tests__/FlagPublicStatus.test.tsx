import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagPublicStatus } from "../FlagPublicStatus";

describe("FlagPublicStatus", () => {
  it("shows amber badge for 'open' status", () => {
    render(<FlagPublicStatus status="open" />);
    const badge = screen.getByTestId("flag-status-badge");
    expect(badge).toHaveTextContent("en cours");
    expect(badge).toHaveAttribute("data-status", "open");
  });

  it("shows amber badge for 'under_review' status", () => {
    render(<FlagPublicStatus status="under_review" />);
    const badge = screen.getByTestId("flag-status-badge");
    expect(badge).toHaveTextContent("en cours");
    expect(badge).toHaveAttribute("data-status", "under_review");
  });

  it("shows green badge for 'accepted' status", () => {
    render(<FlagPublicStatus status="accepted" />);
    const badge = screen.getByTestId("flag-status-badge");
    expect(badge).toHaveTextContent("acceptée");
    expect(badge).toHaveAttribute("data-status", "accepted");
  });

  it("shows grey badge for 'rejected' status", () => {
    render(<FlagPublicStatus status="rejected" />);
    const badge = screen.getByTestId("flag-status-badge");
    expect(badge).toHaveTextContent("rejetée");
    expect(badge).toHaveAttribute("data-status", "rejected");
  });

  it("shows grey badge for 'duplicate' status", () => {
    render(<FlagPublicStatus status="duplicate" />);
    const badge = screen.getByTestId("flag-status-badge");
    expect(badge).toHaveTextContent("doublon");
    expect(badge).toHaveAttribute("data-status", "duplicate");
  });

  it("renders moderator rationale in blockquote for 'rejected'", () => {
    render(
      <FlagPublicStatus
        status="rejected"
        moderatorNotes="La source citée est de niveau Tier 3."
      />
    );
    const blockquote = screen.getByRole("blockquote");
    expect(blockquote).toHaveTextContent(
      "La source citée est de niveau Tier 3."
    );
  });

  it("renders moderator rationale in blockquote for 'duplicate'", () => {
    render(
      <FlagPublicStatus
        status="duplicate"
        moderatorNotes="Ce signalement est identique à ABC123."
      />
    );
    const blockquote = screen.getByRole("blockquote");
    expect(blockquote).toHaveTextContent(
      "Ce signalement est identique à ABC123."
    );
  });

  it("does not render blockquote when moderatorNotes is null", () => {
    render(<FlagPublicStatus status="rejected" moderatorNotes={null} />);
    expect(screen.queryByRole("blockquote")).toBeNull();
  });

  it("shows 'withdrawn' status with neutral badge", () => {
    render(<FlagPublicStatus status="withdrawn" />);
    const badge = screen.getByTestId("flag-status-badge");
    expect(badge).toHaveAttribute("data-status", "withdrawn");
  });
});
