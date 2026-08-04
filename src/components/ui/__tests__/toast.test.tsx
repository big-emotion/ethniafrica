import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToastProvider, ToastViewport } from "../toast";

describe("ToastViewport", () => {
  // @req REQ-043
  it("does not intercept page interactions outside visible toasts", () => {
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>
    );

    expect(screen.getByTestId("toast-viewport")).toHaveClass(
      "pointer-events-none"
    );
  });
});
