import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import AdminSignInPage from "../page";

describe("AdminSignInPage bilingual copy", () => {
  // @req REQ-140
  // @req REQ-145
  it("renders the complete sign-in surface in English", async () => {
    render(
      await AdminSignInPage({
        params: Promise.resolve({ lang: "en" }),
      })
    );

    expect(
      screen.getByText(/Moderation is reserved for email addresses/)
    ).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Receive a sign-in link" })
    ).toBeTruthy();
    expect(
      screen.getByText(/Were you looking to report an error/)
    ).toBeTruthy();
  });
});
