import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useKeyboardShortcuts } from "../use-keyboard-shortcuts";
import { getLocalizedRoute } from "@/lib/routing";

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

  // @req REQ-091
  it("navigates to the search route on Ctrl+K", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: getLocalizedRoute("fr", "search"),
      })
    );
    fireKey("k", false, true);
    expect(navigate).toHaveBeenCalledWith(getLocalizedRoute("fr", "search"));
  });

  // @req REQ-091
  it("navigates to the search route on Meta+K", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: getLocalizedRoute("fr", "search"),
      })
    );
    fireKey("k", true, false);
    expect(navigate).toHaveBeenCalledWith(getLocalizedRoute("fr", "search"));
  });

  it("calls openSearch on '/' key when not in input", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: getLocalizedRoute("fr", "search"),
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
        searchRoute: getLocalizedRoute("fr", "search"),
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
        searchRoute: getLocalizedRoute("fr", "search"),
        peoplesRoute: getLocalizedRoute("fr", "peoples"),
        familiesRoute: getLocalizedRoute("fr", "families"),
      })
    );
    fireKey("g");
    fireKey("p");
    expect(navigate).toHaveBeenCalledWith(getLocalizedRoute("fr", "peoples"));
  });

  it("navigates to families on 'g' then 'f'", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: getLocalizedRoute("fr", "search"),
        peoplesRoute: getLocalizedRoute("fr", "peoples"),
        familiesRoute: getLocalizedRoute("fr", "families"),
      })
    );
    fireKey("g");
    fireKey("f");
    expect(navigate).toHaveBeenCalledWith(getLocalizedRoute("fr", "families"));
  });

  it("opens shortcuts modal on '?'", () => {
    renderHook(() =>
      useKeyboardShortcuts({
        navigate,
        openSearch,
        openShortcutsModal,
        searchRoute: getLocalizedRoute("fr", "search"),
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
        searchRoute: getLocalizedRoute("fr", "search"),
      })
    );
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
