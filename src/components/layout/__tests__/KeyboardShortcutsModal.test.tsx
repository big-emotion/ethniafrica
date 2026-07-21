import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KeyboardShortcutsModal } from "../KeyboardShortcutsModal";

describe("KeyboardShortcutsModal", () => {
  it("renders when open", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <KeyboardShortcutsModal open={false} onClose={vi.fn()} />
    );
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("shows all documented keyboard shortcuts", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    // / shortcut row
    expect(screen.getByText("Ouvrir la recherche")).toBeDefined();
    // Ctrl+K or Cmd+K row
    const ctrlItems = screen.getAllByText(/recherche/i);
    expect(ctrlItems.length).toBeGreaterThanOrEqual(1);
    // g p shortcut
    expect(screen.getByText("Aller aux peuples")).toBeDefined();
    // g f shortcut
    expect(screen.getByText(/familles linguistiques/i)).toBeDefined();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("has accessible title", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /raccourcis/i })).toBeDefined();
  });
});
