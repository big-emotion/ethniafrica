import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useKeyboardShortcuts } from "../use-keyboard-shortcuts";

function fireKey(key: string, meta = false, ctrl = false) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        metaKey: meta,
        ctrlKey: ctrl,
        bubbles: true,
      })
    );
  });
}

describe("useKeyboardShortcuts", () => {
  const navigate = vi.fn();
  const openSearch = vi.fn();
  const openShortcutsModal = vi.fn();

  beforeEach(() => {
    navigate.mockClear();
    openSearch.mockClear();
    openShortcutsModal.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls navigate('/fr/recherche') on Ctrl+K", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: "/fr/recherche",
      })
    );
    fireKey("k", false, true);
    expect(navigate).toHaveBeenCalledWith("/fr/recherche");
  });

  it("calls navigate('/fr/recherche') on Meta+K", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: "/fr/recherche",
      })
    );
    fireKey("k", true, false);
    expect(navigate).toHaveBeenCalledWith("/fr/recherche");
  });

  it("calls openSearch on '/' key when not in input", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: "/fr/recherche",
      })
    );
    fireKey("/");
    expect(openSearch).toHaveBeenCalled();
  });

  it("does not call openSearch on '/' when focus is in an input", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: "/fr/recherche",
      })
    );
    fireKey("/");
    expect(openSearch).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("navigates to peoples on 'g' then 'p'", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: "/fr/recherche",
        peoplesRoute: "/fr/peuples",
        familiesRoute: "/fr/familles",
      })
    );
    fireKey("g");
    fireKey("p");
    expect(navigate).toHaveBeenCalledWith("/fr/peuples");
  });

  it("navigates to families on 'g' then 'f'", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: "/fr/recherche",
        peoplesRoute: "/fr/peuples",
        familiesRoute: "/fr/familles",
      })
    );
    fireKey("g");
    fireKey("f");
    expect(navigate).toHaveBeenCalledWith("/fr/familles");
  });

  it("opens shortcuts modal on '?'", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: "/fr/recherche",
      })
    );
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "?", bubbles: true })
      );
    });
    expect(openShortcutsModal).toHaveBeenCalled();
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: "/fr/recherche",
      })
    );
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
